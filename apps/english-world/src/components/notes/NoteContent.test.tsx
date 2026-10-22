import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { NoteContent } from "./NoteContent";
import { noteSummary } from "./noteSummary";
import { NoteEditor } from "./NoteEditor";
afterEach(cleanup);
it("renders headings, emphasis, lists, quotes, tables and soft line breaks", () => {
  const { container } = render(<NoteContent text={'## 用法\n\n**重点**与*区别*\n下一行\n\n- first\n- second\n\n> 例句\n\n| 词 | 意思 |\n| --- | --- |\n| preserve | 保留 |'} />);
  expect(screen.getByRole("heading", { name: "用法" })).toBeInTheDocument();
  expect(container.querySelector("strong")).toHaveTextContent("重点");
  expect(container.querySelectorAll("li")).toHaveLength(2);
  expect(container.querySelector("blockquote")).toHaveTextContent("例句");
  expect(screen.getByRole("table")).toHaveTextContent("preserve");
  expect(container.querySelector("br")).toBeInTheDocument();
});
it("does not execute HTML, unsafe links or load remote images", () => {
  const { container } = render(<NoteContent text={'<script>alert(1)</script>\n\n[坏链接](javascript:alert(1))\n\n![图示](https://tracker.invalid/pixel.png)\n\n[课程](https://example.com)'} />);
  expect(container.querySelector("script,img,iframe")).toBeNull();
  expect(screen.getByText("坏链接").closest("a")).not.toHaveAttribute("href", expect.stringMatching(/^javascript:/));
  expect(screen.getByText("图示")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "课程" })).toHaveAttribute("rel", "noopener noreferrer");
});
it("summarizes semantic text without losing code, escapes or table cell boundaries", () => {
  expect(noteSummary('## 用法\n\n**important** [词](https://example.com) `a_b`\n\n- 第一项\n- 第二项')).toBe('用法 important 词 a_b 第一项 第二项');
  expect(noteSummary('| 词 | 意思 |\n| --- | --- |\n| apple | 苹果 |')).toBe('词 意思 apple 苹果');
  expect(noteSummary('普通第一行\n第二行')).toBe('普通第一行 第二行');
  expect(noteSummary('\\*原文符号\\*')).toBe('*原文符号*');
});
it("switches preview without modifying the exact source or submitting", () => {
  const original = '## 标题\n\n**重点**\n末行  \n';
  const save = vi.fn();
  function Form() { const [value, setValue] = useState(original); return <form onSubmit={e => { e.preventDefault(); save(value); }}><NoteEditor aria-label="正文" value={value} onChange={e => setValue(e.target.value)} /><button type="submit">保存</button></form>; }
  render(<Form />);
  fireEvent.click(screen.getByRole("button", { name: "预览正文" }));
  expect(screen.getByRole("heading", { name: "标题" })).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "编辑正文" }));
  expect(screen.getByRole("textbox", { name: "正文" })).toHaveValue(original);
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(save).toHaveBeenCalledWith(original);
});

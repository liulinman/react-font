import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WordAgentTab } from "./WordAgentTab";

vi.mock("@font/api", () => ({
  default: vi.fn(),
  getApiBaseUrl: () => "/api",
}));

describe("WordAgentTab", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a compact word lookup command panel", () => {
    render(<WordAgentTab />);

    expect(screen.getByRole("heading", { name: "查词" })).toBeInTheDocument();
    expect(screen.getByLabelText("单词或短语")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "confront" })).toBeInTheDocument();
    expect(screen.queryByText("等待查询")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("查询结果")).not.toBeInTheDocument();
    expect(screen.queryByText("查询后可以做什么")).not.toBeInTheDocument();
    expect(screen.queryByText("单词查询工作台")).not.toBeInTheDocument();
  });

  it("keeps the query action as a compact button", () => {
    render(<WordAgentTab />);

    expect(screen.getByRole("button", { name: /查询/ })).not.toHaveClass(
      "ant-btn-lg",
    );
  });
});

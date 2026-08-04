import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasDisplayNote,
  WordCardNote,
  WordExpandedNote,
} from "./WordNoteDisplay";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WordNoteDisplay", () => {
  it.each([undefined, null, "", "   \n  "])(
    "treats %s as no note",
    (note) => expect(hasDisplayNote(note)).toBe(false),
  );

  it("preserves a short note without an unnecessary expand control", () => {
    render(<WordCardNote word="insect" note="原始词形：insects" />);

    expect(screen.getByText("原始词形：insects")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "展开 insect 的笔记" }),
    ).not.toBeInTheDocument();
  });

  it("expands and collapses an overflowing card note", () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(72);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);

    render(<WordCardNote word="preserve" note={"long note ".repeat(30)} />);

    const expand = screen.getByRole("button", {
      name: "展开 preserve 的笔记",
    });
    expect(expand).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(expand);

    const collapse = screen.getByRole("button", {
      name: "收起 preserve 的笔记",
    });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/long note/)).toHaveClass(
      "word-card-note-text-expanded",
    );

    fireEvent.click(collapse);

    expect(
      screen.getByRole("button", { name: "展开 preserve 的笔记" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the full expanded-row note and delegates editing", () => {
    const record = {
      id: 7,
      englishWord: "preserve",
      englishType: 0,
      englishLevel: 1,
      englishNote: "first line\nsecond line",
    };
    const onEdit = vi.fn();
    const { container } = render(
      <WordExpandedNote record={record} onEdit={onEdit} />,
    );

    expect(
      container.querySelector(".word-note-expanded-text"),
    ).toHaveTextContent("first line second line");

    fireEvent.click(
      screen.getByRole("button", { name: "编辑 preserve 的笔记" }),
    );

    expect(onEdit).toHaveBeenCalledWith(record);
  });
});

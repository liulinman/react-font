import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import EnglishWorld from "./EnglishWorld";

vi.mock("@font/api", () => ({
  default: vi.fn(() =>
    Promise.resolve({
      list: [],
      total: 0,
      totalPages: 0,
    }),
  ),
  useMutation: () => ({
    mutateAsync: vi.fn(() => Promise.resolve(false)),
    isPending: false,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "tester" },
    logout: vi.fn(),
  }),
}));

vi.mock("./cockpit/LearningCockpitPage", () => ({
  LearningCockpitPage: () => <div>Mock Cockpit</div>,
}));

vi.mock("./component/EnglishStats", () => ({
  EnglishStats: () => <div>Mock Stats</div>,
}));

vi.mock("./contextLab/ContextLabPage", () => ({
  ContextLabPage: () => <div>Mock Context Lab</div>,
}));

vi.mock("./memoryMap/MemoryMapPage", () => ({
  MemoryMapPage: () => <div>Mock Memory Map</div>,
}));

describe("EnglishWorld ToC routing", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the word library when pathname is /englishWorld/words", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("单词列表")).toBeInTheDocument();
    expect(screen.queryByText("Mock Cockpit")).not.toBeInTheDocument();
  });

  it("renders stats when pathname is /englishWorld/stats", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld/stats"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mock Stats")).toBeInTheDocument();
    expect(screen.queryByText("Mock Cockpit")).not.toBeInTheDocument();
  });

  it("keeps legacy hash entries usable for list and stats", () => {
    render(
      <MemoryRouter initialEntries={["/englishWorld#list"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("单词列表")).toBeInTheDocument();

    cleanup();

    render(
      <MemoryRouter initialEntries={["/englishWorld#stat"]}>
        <EnglishWorld />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mock Stats")).toBeInTheDocument();
  });
});

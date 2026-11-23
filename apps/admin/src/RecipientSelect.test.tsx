import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RecipientSelect } from "./RecipientSelect";

vi.mock("@font/api", () => ({
  default: vi.fn(async () => ({
    list: [
      { id: 42, username: "alin", displayName: "小林", avatar: "data:image/jpeg;base64,avatar" },
      { id: 52, username: "周同学", avatar: null },
    ],
  })),
}));

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows avatars or initials in the menu and uses names for selected labels", async () => {
  function Picker() {
    const [value, setValue] = useState<number[]>([]);
    return <RecipientSelect value={value} onChange={setValue} />;
  }
  const { container } = render(<Picker />);
  fireEvent.mouseDown(screen.getByRole("combobox"));
  const user = await screen.findByText("小林");
  expect(container.ownerDocument.querySelector('img[src="data:image/jpeg;base64,avatar"]')).toBeInTheDocument();
  expect(screen.getByText("周")).toBeInTheDocument();
  expect(screen.queryByText("alin")).not.toBeInTheDocument();
  expect(screen.queryByText(/#42|#52/)).not.toBeInTheDocument();
  fireEvent.click(user);
  expect(container.querySelector(".ant-select-selection-item-content")).toHaveTextContent(/^小林$/);
});

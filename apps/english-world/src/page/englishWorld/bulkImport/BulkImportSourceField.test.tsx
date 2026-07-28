import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import {
  BulkImportSourceField,
} from "./BulkImportSourceField";
import type { SharedImportSource } from "./bulkImportSource";

const requestMock = vi.fn();

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
}));

function ControlledSourceField({
  onChange,
  initialValue = { mode: "none", url: "" },
}: {
  onChange?: (source: SharedImportSource) => void;
  initialValue?: SharedImportSource;
}) {
  const [value, setValue] = useState<SharedImportSource>(initialValue);

  return (
    <BulkImportSourceField
      value={value}
      onChange={(source) => {
        setValue(source);
        onChange?.(source);
      }}
    />
  );
}

describe("BulkImportSourceField", () => {
  beforeEach(() => {
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
    requestMock.mockReset();
  });

  it("switches source modes and clears the previous value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledSourceField onChange={onChange} />);

    await user.click(screen.getByText("网页链接"));
    expect(onChange).toHaveBeenLastCalledWith({
      mode: "url",
      url: "",
    });

    await user.click(screen.getByText("上传文件"));
    expect(onChange).toHaveBeenLastCalledWith({
      mode: "file",
      url: "",
    });
  });

  it("shows a validation error for a non-http web source", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ControlledSourceField
        initialValue={{ mode: "url", url: "" }}
        onChange={onChange}
      />,
    );

    const input = screen.getByPlaceholderText(
      "粘贴文章网页地址，例如 https://...",
    );
    await user.type(input, "article.pdf");
    await user.tab();

    expect(screen.getByText("请输入 http:// 或 https:// 开头的链接")).toBeInTheDocument();
  });

  it("uploads an accepted file and exposes its protected URL", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    requestMock.mockResolvedValue({
      url: "/api/upload/source-file/7/11111111-1111-4111-8111-111111111111.pdf",
      originalName: "reading.pdf",
      mimeType: "application/pdf",
      size: 3,
    });
    const { container } = render(
      <BulkImportSourceField
        value={{ mode: "file", url: "" }}
        onChange={onChange}
      />,
    );
    const fileInput = container.querySelector<HTMLInputElement>(
      'input[type="file"]',
    );
    expect(fileInput).not.toBeNull();

    await user.upload(
      fileInput!,
      new File(["pdf"], "reading.pdf", {
        type: "application/pdf",
      }),
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/upload/source-file",
          method: "POST",
        }),
      );
      expect(onChange).toHaveBeenCalledWith({
        mode: "file",
        url: "/api/upload/source-file/7/11111111-1111-4111-8111-111111111111.pdf",
        name: "reading.pdf",
      });
    });
  });
});

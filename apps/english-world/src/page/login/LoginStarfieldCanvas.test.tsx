import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginStarfieldCanvas, {
  BLACK_HOLE_GRAVITY,
} from "./LoginStarfieldCanvas";

describe("LoginStarfieldCanvas", () => {
  const originalMatchMedia = window.matchMedia;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
    })) as unknown as HTMLCanvasElement["getContext"];

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("renders a decorative canvas layer", () => {
    render(<LoginStarfieldCanvas />);

    const canvas = screen.getByTestId("login-starfield-canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass("login-interactive-starfield");
  });

  it("accepts pointer movement without throwing", () => {
    render(<LoginStarfieldCanvas />);

    expect(() => {
      fireEvent.pointerMove(screen.getByTestId("login-starfield-canvas"), {
        clientX: 120,
        clientY: 90,
      });
    }).not.toThrow();
  });

  it("exposes a center-left black-hole gravity well", () => {
    expect(BLACK_HOLE_GRAVITY.xRatio).toBeLessThan(0.5);
    expect(BLACK_HOLE_GRAVITY.yRatio).toBeGreaterThan(0.28);
    expect(BLACK_HOLE_GRAVITY.yRatio).toBeLessThan(0.62);
    expect(BLACK_HOLE_GRAVITY.radius).toBeGreaterThan(220);
  });
});

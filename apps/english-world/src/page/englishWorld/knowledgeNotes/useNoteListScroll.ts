import { useEffect, useRef } from "react";
// Session-only positions contain no note content and are bounded across filter combinations.
const positions = new Map<string, number>();
export function useNoteListScroll(key: string, loaded: boolean) {
  const root = useRef<HTMLDivElement>(null);
  const container = () =>
    root.current?.closest<HTMLElement>(
      ".mobile-app-shell__content, .english-world-main",
    );
  useEffect(() => {
    if (!loaded) return;
    const frame = requestAnimationFrame(() => {
      const parent = container();
      if (parent) parent.scrollTop = positions.get(key) ?? 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [key, loaded]);
  function remember() {
    positions.set(key, container()?.scrollTop ?? 0);
    if (positions.size > 50) positions.delete(positions.keys().next().value!);
  }
  return { root, remember };
}

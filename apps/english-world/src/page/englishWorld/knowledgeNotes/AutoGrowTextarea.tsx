import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
export function AutoGrowTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let width = element.clientWidth;
    const resize = () => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    };
    resize();
    if (typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      const next = element.clientWidth;
      if (next !== width) {
        width = next;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(resize);
      }
    });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [props.value]);
  return (
    <textarea
      {...props}
      ref={ref}
      style={{
        ...props.style,
        overflow: "hidden",
        resize: "none",
        minHeight: `${props.rows ?? 6}lh`,
      }}
    />
  );
}

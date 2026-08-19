import { useEffect, useState } from "react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

type MobileImageViewerProps = {
  alt: string;
  src: string;
  triggerClassName?: string;
  triggerLabel?: string;
};

/**
 * Full-screen image viewer backed by react-photo-view. The trigger is a button
 * wrapped in `PhotoView`, so the open gesture is keyboard-operable and announces
 * its intent; the PhotoProvider portal mounts only while open, so the heavy
 * pinch/pan layer never renders eagerly on a detail page.
 *
 * react-photo-view renders the portal with a hard-coded `role="dialog"` and no
 * accessible name, and exposes no prop to name it. To keep the open viewer
 * discoverable by assistive tech (and by role-name queries), we stamp
 * `aria-label` onto the portal element after it mounts while open. The label is
 * cleared on close so a stale name never lingers on a recycled portal node.
 */
export function MobileImageViewer({
  alt,
  src,
  triggerClassName,
  triggerLabel,
}: MobileImageViewerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const portal = document.querySelector<HTMLElement>(".PhotoView-Portal");
    if (portal) portal.setAttribute("aria-label", alt);
    return () => {
      const portal = document.querySelector<HTMLElement>(".PhotoView-Portal");
      if (portal && portal.getAttribute("aria-label") === alt) {
        portal.removeAttribute("aria-label");
      }
    };
  }, [open, alt]);

  return (
    <PhotoProvider
      maskClosable
      onVisibleChange={(visible) => setOpen(visible)}
    >
      <PhotoView src={src}>
        <button
          aria-label={triggerLabel ?? `查看 ${alt}`}
          className={["mobile-image-viewer__trigger", triggerClassName]
            .filter(Boolean)
            .join(" ")}
          type="button"
        >
          <img alt={alt} src={src} />
        </button>
      </PhotoView>
    </PhotoProvider>
  );
}

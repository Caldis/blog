import type { ReactNode } from "react";
import Zmage, { type Set as ZmageSet } from "react-zmage";
import "react-zmage/style.css";

interface AlbumPhoto {
  src: string;
  alt?: string;
  caption?: string;
}

interface AlbumZmageProps {
  photos: AlbumPhoto[];
  children: ReactNode;
}

export default function AlbumZmage({ photos, children }: AlbumZmageProps) {
  const set: ZmageSet[] = photos.map((photo) => ({
    src: photo.src,
    alt: photo.alt,
    caption: photo.caption,
  }));

  return (
    <Zmage.Wrapper
      set={set}
      backdrop="oklch(15% 0.035 245 / 0.96)"
      edge={24}
      zIndex={2000}
      hideOnScroll={false}
      controller={{
        placement: "top-right",
        backdrop: "oklch(24% 0.035 245 / 0.68)",
        color: "oklch(94% 0.012 245)",
        layout: {
          toolbar: { inset: "1rem" },
          flip: { inset: 0 },
          pagination: { inset: "1.25rem" },
          caption: { inset: "3.75rem" },
          mobile: {
            toolbar: { inset: "0.75rem" },
            pagination: { inset: "1rem" },
            caption: { inset: "3.5rem" },
          },
        },
      }}
    >
      {children}
    </Zmage.Wrapper>
  );
}

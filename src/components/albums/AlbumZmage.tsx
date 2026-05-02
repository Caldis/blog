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
    <Zmage.Wrapper set={set} backdrop="var(--bg)">
      {children}
    </Zmage.Wrapper>
  );
}

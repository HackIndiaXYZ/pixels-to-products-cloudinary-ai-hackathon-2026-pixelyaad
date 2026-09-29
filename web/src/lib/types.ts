export interface Photo {
  id: string;
  publicId: string;
  tags: string[];
  caption: string;
  createdAt: string;
  /** Present when this memory has an active public share link. */
  shareToken?: string | null;
}

/** Public view of a shared memory — no internal ids. */
export interface SharedPhoto {
  publicId: string;
  caption: string;
  tags: string[];
  createdAt: string;
}

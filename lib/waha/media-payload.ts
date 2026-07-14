export interface WahaMediaFields {
  mediaUrl?: string;
  mimetype?: string;
  media?: {
    url?: string | null;
    mimetype?: string | null;
    filename?: string | null;
    filesize?: number | null;
  } | null;
}

export function mediaFromPayload(p: WahaMediaFields): {
  url: string | null;
  mimetype: string | null;
  filename: string | null;
  size: number | null;
} {
  return {
    url: p.media?.url ?? p.mediaUrl ?? null,
    mimetype: p.media?.mimetype ?? p.mimetype ?? null,
    filename: p.media?.filename ?? null,
    size: p.media?.filesize ?? null,
  };
}

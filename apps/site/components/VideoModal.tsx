"use client";

import { useEffect } from "react";

/* Accepts any of the common YouTube URL shapes (youtu.be/<id>, watch?v=<id>,
   embed/<id>) and pulls out the 11-char video id the embed endpoint wants. */
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  return match?.[1] ?? null;
}

export function VideoModal({
  url,
  open,
  onClose,
}: {
  url: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Product demo video"
      className="animate-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-panel relative w-full max-w-2xl overflow-hidden rounded-2xl bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M1 1l12 12M13 1 1 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="aspect-video w-full">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title="Plinth product demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

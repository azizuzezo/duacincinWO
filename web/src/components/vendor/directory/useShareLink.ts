"use client";

import { useCallback } from "react";

import { useToast } from "@/components/ui/Toast";

/** Share a page of this site: the device's share sheet on touch devices that
 * have one (navigator.share), otherwise copy the link and confirm in a toast.
 * Resolves true when the link was copied (so the caller can flash a check). */
export function useShareLink() {
  const toast = useToast();
  return useCallback(
    async (title: string, path: string): Promise<boolean> => {
      const url = `${window.location.origin}${path}`;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      if (coarse && typeof navigator.share === "function") {
        try {
          await navigator.share({ title, url });
          return false;
        } catch (err) {
          // Closing the share sheet is not an error worth a message.
          if (err instanceof DOMException && err.name === "AbortError") return false;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast.show("Tautan profil disalin", "success");
        return true;
      } catch {
        toast.show("Tautan belum bisa disalin. Salin dari kolom alamat browser.", "danger");
        return false;
      }
    },
    [toast],
  );
}

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone, X } from "lucide-react";
import { fetchPendingAnnouncements, dismissAnnouncement } from "@/api/announcements";
import { useAuthStore } from "@/store/authStore";
import type { Announcement } from "@/types/announcement";

const LS_KEY = "mangalovers-dismissed-announcements";
const SS_KEY = "mangalovers-announcements-checked";

function getDismissedIds(): number[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addDismissedId(id: number) {
  try {
    const ids = getDismissedIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(LS_KEY, JSON.stringify(ids));
    }
  } catch { /* ignore */ }
}

export function AnnouncementModal() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  const fetchAndShow = useCallback(async () => {
    if (sessionStorage.getItem(SS_KEY)) return;

    try {
      const seenIds = getDismissedIds();
      const pending = await fetchPendingAnnouncements(seenIds);
      if (pending.length > 0) {
        setAnnouncement(pending[0]);
        setOpen(true);
      }
    } catch {
      // Silenciar error — no crítico
    } finally {
      sessionStorage.setItem(SS_KEY, "true");
    }
  }, []);

  useEffect(() => {
    fetchAndShow();
  }, [fetchAndShow]);

  const handleDismiss = async () => {
    if (!announcement) return;
    addDismissedId(announcement.id);

    if (isAuthenticated) {
      try {
        await dismissAnnouncement(announcement.id);
      } catch { /* ignore */ }
    }

    setOpen(false);
    setAnnouncement(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center size-12 rounded-xl bg-brand/15 text-brand mx-auto mb-2">
            <Megaphone className="size-6" />
          </div>
          <DialogTitle className="sr-only">Anuncio</DialogTitle>
          <DialogDescription className="sr-only">
            Anuncio importante de Mangalovers
          </DialogDescription>
        </DialogHeader>

        {announcement && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {announcement.body}
            </ReactMarkdown>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={handleDismiss}>
            <X className="size-4" />
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

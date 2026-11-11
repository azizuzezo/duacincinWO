"use client";

import { createContext, useContext } from "react";

import { chatDayLabel, formatJam } from "@/components/booking/format";
import { describeConversation } from "@/components/ConversationList";
import { Button } from "@/components/ui/Button";
import type { Conversation, MessageStatus } from "@/lib/api";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";

/** What an open thread shares with the header it renders (close button). */
type ChatSessionValue = {
  conversation: Conversation | null;
  currentUserId: string;
  busy: boolean;
  requestClose: () => void;
};

export const ChatSessionContext = createContext<ChatSessionValue | null>(null);

export function useChatSession(): ChatSessionValue | null {
  return useContext(ChatSessionContext);
}

/** Who closed the session, from the viewer's side ("kamu", the vendor's
 * business name, "Wedding Consultant", the couple's name). */
export function closerName(c: Conversation, currentUserId: string): string {
  const by = c.closed_by;
  if (!by) return "salah satu peserta";
  if (by === currentUserId) return "kamu";
  const viewerIsClient = c.client_id === currentUserId;
  if (by === c.client_id || viewerIsClient) return describeConversation(c, currentUserId).name;
  // Staff looking at a consultation another staff member closed.
  return "tim konsultan";
}

/** "hari ini, pukul 14.20" / "kemarin, pukul 09.05" / "pada Senin, 9 November 2026, pukul 14.20". */
export function closedWhen(iso: string): string {
  const day = chatDayLabel(iso);
  const lead = day === "Hari ini" ? "hari ini" : day === "Kemarin" ? "kemarin" : `pada ${day}`;
  return `${lead}, pukul ${formatJam(iso)}`;
}

/**
 * "Tutup sesi" for the thread header. Only shown while the session is open:
 * reopening lives in the closed notice that replaces the composer. The label
 * collapses to the icon on phones, the accessible name stays.
 */
export function ChatSessionButton({ tone = "light" }: { tone?: "light" | "plain" }) {
  const session = useChatSession();
  if (!session?.conversation || session.conversation.closed_at) return null;
  return (
    <button
      type="button"
      onClick={session.requestClose}
      disabled={session.busy}
      aria-haspopup="dialog"
      className={`inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-dc-text-2 transition-colors hover:bg-dc-cream hover:text-dc-ink disabled:opacity-50 motion-safe:active:scale-[0.98] sm:px-3.5 ${
        tone === "light" ? "" : "border border-dc-line-strong"
      } ${FOCUS}`}
    >
      <SessionIcon />
      <span className="sr-only sm:not-sr-only">Tutup sesi</span>
    </button>
  );
}

/** Folded ribbon over a closed chat bubble: "the conversation is set aside". */
function SessionIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M9 11.5h6" />
    </svg>
  );
}

/** Divider at the end of the history, so the moment of closing is part of the story. */
export function ClosedMarker({ conversation, currentUserId }: { conversation: Conversation; currentUserId: string }) {
  if (!conversation.closed_at) return null;
  const who = closerName(conversation, currentUserId);
  return (
    <li className="mt-5 flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-dc-line-strong" />
      <span className="rounded-full bg-dc-cream px-3 py-1 text-center text-xs font-semibold text-dc-text-2">
        Sesi ditutup {who === "kamu" ? "olehmu" : `oleh ${who}`} · {formatJam(conversation.closed_at)}
      </span>
      <span className="h-px flex-1 bg-dc-line-strong" />
    </li>
  );
}

/** Takes the composer's place while the session is closed. */
export function ClosedNotice({ conversation, currentUserId, busy, onReopen }: { conversation: Conversation; currentUserId: string; busy: boolean; onReopen: () => void }) {
  const who = closerName(conversation, currentUserId);
  const when = conversation.closed_at ? closedWhen(conversation.closed_at) : "";
  return (
    <div role="status" className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
      <span aria-hidden className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dc-gold/50 bg-dc-cream text-dc-clay sm:flex">
        <SessionIcon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-xl leading-tight text-dc-ink">Sesi chat sedang ditutup</p>
        <p className="mt-0.5 text-sm leading-relaxed text-dc-text-2">
          Ditutup {who === "kamu" ? "olehmu" : `oleh ${who}`} {when}. Riwayat pesan tetap tersimpan, dan kalian berdua bisa membukanya lagi kapan saja.
        </p>
      </div>
      <Button size="sm" variant="primary" onClick={onReopen} loading={busy} className="self-start sm:self-auto">
        Buka kembali sesi
      </Button>
    </div>
  );
}

const STATUS_LABEL: Record<MessageStatus, string> = {
  sent: "Terkirim",
  delivered: "Diterima",
  read: "Dibaca",
};

/**
 * Ticks on the sender's own bubbles (on ink): one grey = stored, two grey =
 * reached the other side's app, two blue = they opened the thread.
 * The blue (#9CCFF0, 11:1 on ink) is the only cool colour in the product,
 * reserved for this one meaning; grey sits at half strength (4.8:1) so the
 * two states also differ in brightness, not only in hue.
 */
export function MessageTicks({ status = "sent" }: { status?: MessageStatus }) {
  const label = STATUS_LABEL[status];
  const color = status === "read" ? "text-[#9ccff0]" : "text-dc-on-dark/50";
  return (
    <svg
      role="img"
      aria-label={label}
      width="18"
      height="12"
      viewBox="0 0 18 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={status === "read" ? 2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-colors duration-300 ${color}`}
    >
      <title>{label}</title>
      {status === "sent" ? (
        <path d="M3.5 6.5 6.5 9.5 13 2.5" />
      ) : (
        <>
          <path d="M1.5 6.5 4.5 9.5 11 2.5" />
          {/* Second tick starts where it meets the first, like a printed double check. */}
          <path d="M6.7 7.2 9 9.5 15.5 2.5" />
        </>
      )}
    </svg>
  );
}

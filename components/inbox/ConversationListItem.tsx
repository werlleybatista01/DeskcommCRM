"use client";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Robot } from "@/lib/ui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

interface Props {
  conversation: ConversationWithContact;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  open: "bg-muted-foreground/60",
  claimed: "bg-blue-500",
  ai_handling: "bg-purple-500",
  closed: "bg-muted-foreground/30",
  archived: "bg-muted-foreground/20",
};

function initials(name: string | null | undefined, fallback: string): string {
  const v = (name ?? "").trim();
  if (!v) return fallback.slice(0, 2).toUpperCase();
  const parts = v.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback.slice(0, 2).toUpperCase();
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return format(d, "HH:mm");
  const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 7) return formatDistanceToNowStrict(d, { addSuffix: false, locale: ptBR });
  return format(d, "dd/MM");
}

export function ConversationListItem({ conversation, isSelected, onSelect }: Props) {
  const c = conversation.contacts ?? null;
  const displayName =
    c?.display_name?.trim() ||
    c?.name?.trim() ||
    c?.phone_number ||
    "Sem nome";
  const phoneFallback = c?.phone_number ?? "??";
  const tags = c?.tags ?? [];
  const visibleTags = tags.slice(0, 2);
  const overflow = tags.length - visibleTags.length;
  const preview = conversation.last_message_preview?.trim() || "Sem mensagens";
  const truncated = preview.length > 60 ? `${preview.slice(0, 60)}…` : preview;
  const time = relativeTime(conversation.last_message_at);
  const unread = conversation.unread_count_for_assignee ?? 0;
  const dot = STATUS_DOT[conversation.status] ?? STATUS_DOT.open;
  const isAi = conversation.status === "ai_handling";

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "group flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-accent/40",
        isSelected && "bg-accent/60",
      )}
      aria-current={isSelected ? "true" : undefined}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          {c?.avatar_url && <AvatarImage src={c.avatar_url} alt={displayName} />}
          <AvatarFallback className="text-xs">
            {initials(displayName, phoneFallback)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-background",
            dot,
          )}
          aria-hidden
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              c?.is_anonymized && "italic text-muted-foreground",
            )}
          >
            {displayName}
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
            {time}
          </span>
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {isAi ? <Robot size={10} weight="duotone" className="mr-1 inline" aria-hidden /> : null}
          {truncated}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {visibleTags.map((t) => (
            <Badge key={t} variant="secondary" className="h-4 px-1.5 text-[10px]">
              {t}
            </Badge>
          ))}
          {overflow > 0 && (
            <span className="text-[10px] text-muted-foreground">+{overflow}</span>
          )}
          {c?.is_blocked && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              Bloqueado
            </Badge>
          )}
          {c?.is_anonymized && (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              Anonimizado
            </Badge>
          )}
          {unread > 0 && (
            <Badge className="ml-auto h-4 min-w-4 px-1.5 text-[10px]">{unread}</Badge>
          )}
        </div>
      </div>
    </button>
  );
}

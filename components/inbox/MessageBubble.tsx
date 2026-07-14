"use client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  Checks,
  ImageIcon,
  MusicNote,
  FileText,
  Robot,
  WarningOctagon,
} from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Message } from "@/lib/types/messaging";
import { CitationButton } from "@/components/ai/CitationButton";
import { extractCitations, isAiGeneratedMessage } from "@/lib/ai/citations/types";

interface Props {
  message: Message;
  debugCitations?: boolean;
}

function MediaPlaceholder({ type }: { type: string }) {
  const map: Record<string, { Icon: typeof ImageIcon; label: string }> = {
    image: { Icon: ImageIcon, label: "Imagem" },
    audio: { Icon: MusicNote, label: "Áudio" },
    video: { Icon: ImageIcon, label: "Vídeo" },
    document: { Icon: FileText, label: "Documento" },
    sticker: { Icon: ImageIcon, label: "Figurinha" },
  };
  const entry = map[type] ?? map.document!;
  const Icon = entry.Icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <Icon size={12} weight="duotone" aria-hidden /> {entry.label}
    </span>
  );
}

function MessageMedia({ message }: { message: Message }) {
  const src = `/api/v1/messages/${message.id}/media`;
  const filename =
    typeof message.metadata?.media_filename === "string"
      ? message.metadata.media_filename
      : "Baixar arquivo";

  if (message.type === "image" || message.type === "sticker") {
    return (
      <img
        src={src}
        alt={message.type === "sticker" ? "Figurinha" : "Imagem recebida"}
        className="mb-1 max-h-80 max-w-full rounded-lg object-contain"
        loading="lazy"
      />
    );
  }
  if (message.type === "audio") {
    return (
      <audio
        controls
        preload="metadata"
        src={src}
        className="mb-1 h-10 max-w-full"
        aria-label="Mensagem de áudio"
      />
    );
  }
  if (message.type === "video") {
    return (
      <video
        controls
        preload="metadata"
        src={src}
        className="mb-1 max-h-80 max-w-full rounded-lg"
        aria-label="Vídeo recebido"
      />
    );
  }
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="mb-1 inline-flex items-center gap-1.5 underline underline-offset-2"
    >
      <FileText size={14} aria-hidden /> {filename}
    </a>
  );
}

function AckIndicator({ status }: { status: string }) {
  if (status === "read") {
    return <Checks size={12} weight="bold" className="text-blue-400" aria-label="Lida" />;
  }
  if (status === "delivered") {
    return <Checks size={12} weight="bold" className="text-current/70" aria-label="Entregue" />;
  }
  if (status === "sent") {
    return <Check size={12} weight="bold" className="text-current/70" aria-label="Enviada" />;
  }
  return null;
}

export function MessageBubble({ message, debugCitations }: Props) {
  const isOutbound = message.direction === "outbound";
  const time = format(new Date(message.sent_at), "HH:mm", { locale: ptBR });
  const isFailed = message.status === "failed";
  const aiGenerated = isAiGeneratedMessage(message.metadata);
  const citations = extractCitations(message.metadata);
  const showCitationButton = isOutbound && aiGenerated && (debugCitations ?? false);
  const senderLabel = (() => {
    if (!isOutbound) return null;
    if (message.sent_via === "ai") return "IA";
    return null;
  })();

  return (
    <div className={cn("flex w-full px-4 py-1", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isOutbound
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
          isFailed && "border border-destructive",
        )}
      >
        {senderLabel && (
          <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {senderLabel === "IA" ? <Robot size={10} weight="duotone" aria-hidden /> : null}
            {senderLabel}
          </div>
        )}

        {(message.media_url || message.media_storage_path) && <MessageMedia message={message} />}

        {message.body && (
          <p className="whitespace-pre-wrap break-words leading-snug">{message.body}</p>
        )}

        {!message.body &&
          !message.media_url &&
          !message.media_storage_path &&
          message.type !== "text" && <MediaPlaceholder type={message.type} />}

        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            isOutbound ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          <span>{time}</span>
          {showCitationButton && <CitationButton citations={citations} messageId={message.id} />}
          {isOutbound && !isFailed && <AckIndicator status={message.status} />}
          {isFailed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-0.5 font-semibold text-destructive">
                  <WarningOctagon size={10} weight="fill" aria-hidden /> Falhou
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {message.error_message ?? message.error_code ?? "Erro desconhecido"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

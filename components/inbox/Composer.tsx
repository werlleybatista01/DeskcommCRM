"use client";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { PaperPlaneTilt, Paperclip } from "@/lib/ui/icons";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/hooks/inbox/useSendMessage";
import { useUnblockContact } from "@/hooks/inbox/useUnblockContact";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ComposerHandle {
  focus: () => void;
}

interface Props {
  conversationId: string;
  disabled?: boolean;
  /** Set true when contact is blocked / anonymized — explanation shown. */
  blockedReason?: string | null;
  contactId?: string | null;
}

export const Composer = forwardRef<ComposerHandle, Props>(function Composer(
  { conversationId, disabled, blockedReason, contactId },
  ref,
) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const send = useSendMessage();
  const unblock = useUnblockContact();

  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
  }));

  const isDisabled = disabled || !!blockedReason || send.isPending;

  function autoresize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  function mediaType(mime: string): "image" | "audio" | "video" | "document" {
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    return "document";
  }

  function readAsDataUrl(selected: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("file_read_failed"));
      reader.readAsDataURL(selected);
    });
  }

  async function handleSubmit() {
    const body = text.trim();
    if ((!body && !file) || isDisabled) return;
    let mediaData: string | undefined;
    try {
      mediaData = file ? await readAsDataUrl(file) : undefined;
    } catch {
      toast.error("Não foi possível ler o arquivo selecionado.");
      return;
    }
    send.mutate(
      file
        ? {
            conversation_id: conversationId,
            body: body || undefined,
            type: mediaType(file.type),
            media_data: mediaData,
            media_mime: file.type || "application/octet-stream",
            media_filename: file.name,
          }
        : { conversation_id: conversationId, body, type: "text" },
      {
        onSuccess: () => {
          setText("");
          setFile(null);
          if (fileRef.current) fileRef.current.value = "";
          requestAnimationFrame(() => autoresize());
        },
      },
    );
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > 32 * 1024 * 1024) {
      e.target.value = "";
      setFile(null);
      toast.error("O arquivo deve ter no máximo 32 MB.");
      return;
    }
    setFile(selected);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  if (blockedReason) {
    return (
      <div className="bg-muted/40 flex items-center justify-center gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>{blockedReason}</span>
        {contactId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={unblock.isPending}
            onClick={() => unblock.mutate(contactId)}
          >
            {unblock.isPending ? "Desbloqueando…" : "Desbloquear contato"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-background px-3 py-2">
      {file && (
        <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-xs">
          <span className="truncate">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
          </span>
          <button type="button" className="ml-2 font-medium" onClick={() => setFile(null)}>
            Remover
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          onChange={onFileChange}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          aria-label="Anexar"
          disabled={isDisabled}
          title="Anexar arquivo (até 32 MB)"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip size={16} weight="regular" aria-hidden />
        </Button>
        <div className="relative">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            aria-label="Inserir emoji"
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={isDisabled}
          >
            <span aria-hidden>🙂</span>
          </Button>
          {emojiOpen && (
            <div className="absolute bottom-11 left-0 z-20 flex w-48 flex-wrap gap-1 rounded-md border bg-popover p-2 shadow-md">
              {["😀", "😂", "😊", "😍", "🥰", "👍", "🙏", "❤️", "🎉", "✅", "😉", "😢"].map(
                (emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="rounded p-1 text-lg hover:bg-muted"
                    onClick={() => {
                      setText((v) => v + emoji);
                      setEmojiOpen(false);
                      taRef.current?.focus();
                    }}
                  >
                    {emoji}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autoresize();
          }}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
          className={cn(
            "max-h-40 min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
          )}
          disabled={isDisabled}
          aria-label="Mensagem"
        />
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSubmit}
          disabled={isDisabled || (!text.trim() && !file)}
          aria-label="Enviar"
        >
          <PaperPlaneTilt size={16} weight="fill" aria-hidden />
        </Button>
      </div>
    </div>
  );
});

import type { WahaContactProfile } from "./client";

interface DirectionalNamePayload {
  fromMe?: boolean;
  _data?: {
    notifyName?: string;
    pushName?: string;
  };
}

export function remoteNameFromEvent(payload: DirectionalNamePayload): string | null {
  // WEBJS can put the connected account's own pushName on outbound events.
  // That value belongs to the operator, never to the remote recipient.
  if (payload.fromMe) return null;
  return payload._data?.notifyName ?? payload._data?.pushName ?? null;
}

export function remoteNameFromContact(contact: WahaContactProfile | null): string | null {
  if (!contact || contact.isMe) return null;
  return contact.name?.trim() || contact.pushname?.trim() || contact.shortName?.trim() || null;
}

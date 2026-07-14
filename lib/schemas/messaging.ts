/**
 * Schemas Zod do EPIC-03 Inbox + Messaging.
 *
 * Cobre boundary de validação das rotas /api/v1/conversations e
 * /api/v1/messages. Validações compartilhadas entre rota REST e webhooks
 * (quando o payload entra na pipeline pós-verificação HMAC).
 */
import { z } from "zod";

export const conversationStatusSchema = z.enum([
  "open",
  "claimed",
  "ai_handling",
  "closed",
  "archived",
]);

export const messageDirectionSchema = z.enum(["inbound", "outbound"]);

export const messageTypeSchema = z.enum([
  "text",
  "image",
  "audio",
  "document",
  "sticker",
  "video",
  "location",
  "contact",
]);

export const messageStatusSchema = z.enum([
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
]);

export const sendMessageSchema = z
  .object({
    conversation_id: z.string().uuid(),
    type: messageTypeSchema.default("text"),
    body: z.string().min(1).max(4096).optional(),
    media_url: z
      .string()
      .url()
      .refine((value) => value.startsWith("https://"), "media_url must use https")
      .optional(),
    media_mime: z
      .string()
      .min(3)
      .max(150)
      .regex(/^[\w.+-]+\/[\w.+-]+(?:;\s*[\w.+-]+=[\w.+-]+)*$/)
      .optional(),
    media_data: z
      .string()
      .max(45_000_000)
      .regex(/^(?:data:[^,]+;base64,)?[A-Za-z0-9+/]+={0,2}$/)
      .optional(),
    media_filename: z.string().min(1).max(255).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((d) => !!d.body || !!d.media_url || !!d.media_data, {
    message: "body or media required",
    path: ["body"],
  })
  .refine((d) => !d.media_data || !!d.media_mime, {
    message: "media_mime required with media_data",
    path: ["media_mime"],
  });

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const claimConversationSchema = z.object({
  expected_assignee: z.string().uuid().nullable().optional(),
});

export type ClaimConversationInput = z.infer<typeof claimConversationSchema>;

export const updateConversationStatusSchema = z.object({
  status: conversationStatusSchema,
});

export type UpdateConversationStatusInput = z.infer<typeof updateConversationStatusSchema>;

export const listConversationsQuerySchema = z.object({
  status: conversationStatusSchema.optional(),
  assigned_to: z.union([z.string().uuid(), z.literal("me"), z.literal("unassigned")]).optional(),
  channel_session_id: z.string().uuid().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

export const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

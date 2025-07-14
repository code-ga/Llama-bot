import { z } from "zod";

// Strict sub-schemas
const EmbedThumbnailSchema = z.object({
  url: z.string().url(),
  proxy_url: z.string({ description: "leave undefined if you don't want to proxy" }).url().optional(),
  height: z.number({ description: "leave undefined if you don't want to set" }).int().positive().optional(),
  width: z.number({ description: "leave undefined if you don't want to set" }).int().positive().optional(),
}, { description: "leave undefined if you don't want to set" });

const EmbedImageSchema = EmbedThumbnailSchema;
const EmbedVideoSchema = EmbedThumbnailSchema;

const EmbedProviderSchema = z.object({
  name: z.string({ description: "leave undefined if you don't want to set" }).min(1).optional(),
  url: z.string({ description: "leave undefined if you don't want to set" }).url().optional(),
}, { description: "leave undefined if you don't want to set" });

const EmbedAuthorSchema = z.object({
  name: z.string().min(1).max(256),
  url: z.string({ description: "leave undefined if you don't want to set" }).url().optional(),
  icon_url: z.string({ description: "leave undefined if you don't want to set" }).url().optional(),
  proxy_icon_url: z.string({ description: "leave undefined if you don't want to set" }).url().optional(),
}, { description: "leave undefined if you don't want to set" });

const EmbedFooterSchema = z.object({
  text: z.string().min(1).max(2048),
  icon_url: z.string({ description: "leave undefined if you don't want to set" }).url().optional(),
  proxy_icon_url: z.string({ description: "leave undefined if you don't want to set" }).url().optional(),
}, { description: "leave undefined if you don't want to set" });

const EmbedFieldSchema = z.object({
  name: z.string().min(1).max(256),
  value: z.string().min(1).max(1024),
  inline: z.boolean({ description: "leave undefined if you don't want to set" }).optional().default(false),
}, { description: "leave [] if you don't want to set, if you want to set it, following this: [{name:'', value: '', inline: true}]" });

const EmbedTypeEnum = z.enum([
  "rich", "image", "video", "gifv",
  "article", "link", "auto_moderation_message", "poll_result"
]);

export const APIEmbedSchema = z.object({
  title: z.string().min(1).max(256),
  // type: EmbedTypeEnum.default("rich"),
  description: z.string({ description: "leave undefined if you don't want to set" }).min(1).max(4096).optional(),
  url: z.string({ description: "leave undefined if you don't want to set" }).url().optional(),
  // Enforce valid ISO8601 timestamp string
  // timestamp: z.string()
  //   .datetime({ offset: true })
  //   .transform(str => new Date(str))
  //   .optional(),
  // color: z.number().int().min(0).max(0xFFFFFF).optional(),
  footer: EmbedFooterSchema.optional(),
  image: EmbedImageSchema.optional(),
  thumbnail: EmbedThumbnailSchema.optional(),
  video: EmbedVideoSchema.optional(),
  provider: EmbedProviderSchema.optional(),
  author: EmbedAuthorSchema.optional(),
  fields: z.array(EmbedFieldSchema).max(25).optional().default([]),
});

// Types
export type APIEmbed = z.infer<typeof APIEmbedSchema>;
export type EmbedType = z.infer<typeof EmbedTypeEnum>;
export type APIEmbedThumbnail = z.infer<typeof EmbedThumbnailSchema>;
export type APIEmbedImage = z.infer<typeof EmbedImageSchema>;
export type APIEmbedVideo = z.infer<typeof EmbedVideoSchema>;
export type APIEmbedProvider = z.infer<typeof EmbedProviderSchema>;
export type APIEmbedAuthor = z.infer<typeof EmbedAuthorSchema>;
export type APIEmbedFooter = z.infer<typeof EmbedFooterSchema>;
export type APIEmbedField = z.infer<typeof EmbedFieldSchema>;

import { createFunctionHandler } from "openai-zod-functions";
import z from "zod";
import { evaluate, format } from "mathjs"
import type { Client, Message } from "discord.js";
import { APIEmbedSchema } from "./embed";
import { Manga } from "mangadex-full-api";

export class Context {
  constructor(public client: Client, public message: Message) { }
}

export const getMathTool = (ctx: Context) => {
  const functions = [
    createFunctionHandler({
      name: "execute_math_expression",
      description: "Executes a math expression.",
      schema: z.object({
        expression: z.string(),
      }),

      /**
       * This handler gets called with parsed/validated arguments typed by your schema.
       *
       * You can perform any (async) computation, and return any value you want.
       * Or just return args unchanged if you want to use tool output directly.
       */
      handler: async (args) => {
        const { expression } = args;
        const result = evaluate(expression);
        const formatted = format(result, { notation: 'fixed' });
        return {
          result: formatted
        };
      }
    })
  ];

  return functions
}

export const getMangadexTool = (ctx: Context) => {
  return [
    createFunctionHandler({
      name: "search_manga",
      description: "Return the list of manga that match the query. Return empty array if not found. The service use is MangaDex API.",
      schema: z.object({
        query: z.string(),
        hasAvailableChapters: z.boolean().default(true).nullable().optional(),
        limit: z.number().int().min(1).max(100).default(10).nullable().optional(),
      }),
      handler: async (args) => {
        const { query, hasAvailableChapters, limit } = args;
        const data = await Manga.search({ limit: limit || 10, title: query, hasAvailableChapters: hasAvailableChapters || false, })
        return data;
      }
    }),
    createFunctionHandler({
      name: "get_manga_info",
      description: "Returns information about a manga. The service use is MangaDex API.",
      schema: z.object({
        manga_id: z.string(),
      }),
      handler: async (args) => {
        try {
          const { manga_id } = args;
          const manga = await Manga.get(manga_id);
          return manga;
        } catch (error) {
          return { error: "Manga not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "get_chapters_info_by_manga_id",
      description: "Returns information about a chapter. The service use is MangaDex API.",
      schema: z.object({
        manga_id: z.string({ description: "Manga ID of the chapter you want to get. This field cannot be empty" }),
      }),
      handler: async (args) => {
        try {
          const { manga_id: chapter_id } = args;
          const chapter = await Manga.getFeed(chapter_id);
          return chapter;
        } catch (error) {
          return { error: "Chapter not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "get_statistics_manga",
      description: "Returns statistics information about a manga. The service use is MangaDex API.",
      schema: z.object({
        page_ids: z.array(z.string()),
      }),
      handler: async (args) => {
        try {
          const { page_ids } = args;
          const page = await Manga.getStatistics(page_ids);
          return page;
        } catch (error) {
          return { error: "Page not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "search_and_get_first_result",
      description: "Returns information about a manga. They search and get first result. The service use is MangaDex API.",
      schema: z.object({
        query: z.string(),
      }),
      handler: async (args) => {
        try {
          const { query } = args;
          const cover = await Manga.getByQuery({ title: query, limit: 1 });
          return cover;
        } catch (error) {
          return { error: "Cover not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "random_manga",
      description: "Returns a random manga. The service use is MangaDex API.",
      schema: z.object({}),
      handler: async (args) => {
        try {
          const cover = await Manga.getRandom();
          return cover;
        } catch (error) {
          return { error: "Cover not found" }
        }
      }
    })
  ]
}

export const getMusicTool = (client: Client, message: Message) => {
  return []
}

export const getDiscordTool = (ctx: Context) => {
  return [
    createFunctionHandler({
      name: "get_user_info",
      description: "Returns information about a user.",
      schema: z.object({
        user_id: z.string(),
      }),
      handler: async (args) => {

        try {
          const { user_id } = args;
          const user = await ctx.client.users.fetch(user_id);
          return user;
        } catch (error) {
          return { error: "User not found" }
        }

      }
    }),
    createFunctionHandler({
      name: "get_channel_info",
      description: "Returns information about a channel.",
      schema: z.object({
        channel_id: z.string(),
      }),
      handler: async (args) => {
        try {
          const { channel_id } = args;
          const channel = await ctx.client.channels.fetch(channel_id);
          return channel;
        } catch (error) {
          return { error: "Channel not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "get_guild_info",
      description: "Returns information about a guild.",
      schema: z.object({
        guild_id: z.string(),
      }),
      handler: async (args) => {
        try {

          const { guild_id } = args;
          const guild = await ctx.client.guilds.fetch(guild_id);
          return guild;
        } catch (error) {
          return { error: "Guild not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "get_message_info",
      description: "Returns information about a message.",
      schema: z.object({
        message_id: z.string(),
        channel_id: z.string(),
      }),
      handler: async (args) => {
        try {
          const { message_id, channel_id } = args;
          const channel = (await ctx.client.channels.fetch(channel_id));
          if (!channel) return null;
          if (!channel.isTextBased()) return null;
          const message = await channel.messages.fetch(message_id);
          return message;
        } catch (error) {
          return { error: "Message not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "send_embed_message",
      description: "Sends an embed message to current channel.",
      schema: APIEmbedSchema,
      handler: async (args) => {
        try {
          if (!ctx.message.channel.isSendable()) return { error: "This command can only be used in text channels." };
          console.log(args)
          return await ctx.message.channel.send({ embeds: [args] });
        } catch (error) {
          return { error: "Failed to send message" }
        }
      }
    }),
    createFunctionHandler({
      name: "react_message",
      description: "Reacts to a message.",
      schema: z.object({
        message_id: z.string(),
        emoji: z.string(),
      }),
      handler: async (args) => {
        try {
          const { message_id, emoji } = args;
          if (!message_id) {
            return { error: "Message ID is required" };
          } else if (!emoji) {
            return { error: "Emoji is required" };
          }
          const message = await ctx.message.channel.messages.fetch(message_id);
          if (!message) return { error: "Message not found" };
          await message.react(emoji);
          return message;
        } catch (error) {
          return { error: "Failed to send message" }
        }
      }
    })
  ]
}
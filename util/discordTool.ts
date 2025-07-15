import { createFunctionHandler } from "openai-zod-functions";
import z from "zod";
import { APIEmbedSchema } from "./embed";
import type { Context } from "./tool";

export const getDiscordTool = (ctx: Context) => {
  return [
    createFunctionHandler({
      name: "get_user_info",
      description: "Returns information about a user.From Discord API.",
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
      description: "Returns information about a channel. From Discord API.",
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
      description: "Returns information about a guild. From Discord API.",
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
      description: "Returns information about a message. From Discord API.",
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
      description: "Sends an embed message to current channel. From Discord API.",
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
      description: "Reacts to a message. From Discord API.",
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
    }),
    // get_voice_state
    createFunctionHandler({
      name: "get_voice_state",
      description: "Returns information about a voice state in current guild. From Discord API.",
      schema: z.object({
        user_id: z.string(),
      }),
      handler: async (args) => {
        try {
          const { user_id } = args;
          const voiceState = await ctx.message.guild?.voiceStates.fetch(user_id);
          if (!voiceState) return { error: "User not in voice channel" };
          return voiceState;
        } catch (error) {
          return { error: "Voice state not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "rename_current_thread",
      description: "Renames the current thread. From Discord API.Using this before the first response to rename subject",
      schema: z.object({
        name: z.string(),
      }),
      handler: async (args) => {
        try {
          const { name } = args;
          if (!ctx.thread.isThread()) return { error: "This command can only be used in threads." };
          return await ctx.thread.setName(name);
        } catch (error) {
          return { error: "Failed to rename thread" }
        }
      }
    })
  ]
}
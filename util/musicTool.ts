import { PermissionsBitField } from "discord.js";
import { createFunctionHandler } from "openai-zod-functions";
import z from "zod";
import type { Context } from "./tool";

export const getMusicTool = (ctx: Context) => {
  return [
    createFunctionHandler({
      name: "search_music",
      description: "Return the list of music that match the query. Return empty array if not found. The service use is Lavalink.",
      schema: z.object({
        query: z.string(),
        limit: z.number().int().min(1).max(100).default(10).nullable().optional(),
      }),
      handler: async (args) => {
        const { query, limit } = args;
        if (!query) return { error: "Query is required" };
        const data = await ctx.client.kazagumo.search(query);
        if (data.type == "PLAYLIST")
          return JSON.parse(JSON.stringify(data));
        else return data.tracks.slice(0, limit || 10);
      }
    }),
    createFunctionHandler({
      name: "play",
      description: "Play a song or playlist in current user voice channel. You can using this tool to add song to queue. The service use is Lavalink.",
      schema: z.object({
        query: z.string(),
        force: z.boolean({ description: "If bot is playing but user in another voice, bot will stop playing in this voice channel and play this song in user voice channel" }).default(false).nullable().optional(),
      }),
      handler: async ({ query, force }) => {
        const voiceChannel = ctx.message.member?.voice.channel;
        if (!ctx.message.client.user) return;
        if (!ctx.message.guild) return { error: "This command can only be used in guilds." };
        if (!ctx.message.channel) return { error: "This command can only be used in channels." };
        if (!voiceChannel) return { error: "You need to be in a voice channel to use this command." };
        if (!voiceChannel.joinable) return { error: "Bot can't join this voice channel." };
        if (!force) if (ctx.message.guild.members.me?.voice.channelId && voiceChannel.id !== ctx.message.guild.members.me.voice.channelId) {
          return { error: "You need to be in the same voice channel as the bot to use this command." }
        };

        const permissions = voiceChannel.permissionsFor(ctx.message.client.user);
        if (!permissions?.has(PermissionsBitField.Flags.Connect)) return { error: "Bot isn't connected to this voice channel." };
        if (!permissions.has(PermissionsBitField.Flags.Speak)) return { error: "Bot isn't speaking in this voice channel." };


        if (!query) return { error: "Please provide a search query." };

        // --- search ---
        const search = await ctx.message.client.kazagumo.search(query, { requester: ctx.message.author });
        if (!search.tracks.length || !search.tracks[0]) return { error: "No results found." };

        // --- ensure player ---
        let player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild.id);
        if (!player) {
          player = await ctx.message.client.kazagumo.createPlayer({
            guildId: ctx.message.guild.id,
            textId: ctx.message.channel.id,
            voiceId: voiceChannel.id,
            shardId: ctx.message.guild.shardId,
            volume: 100,
          });
          await new Promise((r) => setTimeout(r, 700)); // chờ kết nối ổn định
        }
        if (search.type === "PLAYLIST") player.queue.add(search.tracks); // do this instead of using for loop if you want queueUpdate not spammy
        else player.queue.add(search.tracks[0]);

        if (!player.playing && !player.paused) player.play();
        return {
          success: true,
          message: `Now playing: ${search.tracks[0].title} - ${search.tracks[0].author}`,
          metadata: search.tracks[0],
        }

      }
    }),
    createFunctionHandler({
      name: "toggle_autoplay",
      description: "Toggle autoplay. This is not working if loop is running",
      schema: z.object({
        autoplay: z.boolean(),
      }),
      handler: async ({ autoplay }) => {
        const voiceChannel = ctx.message.member?.voice.channel;



        if (!ctx.message.client.user) return;

        if (!ctx.message.guild) {
          // await send('Lệnh chỉ có thể sử dụng trong máy chủ!');
          return { error: "This command can only be used in guilds." };
        }

        if (!ctx.message.channel) {
          // await send('Lệnh chỉ có thể sử dụng trong kênh voice!');
          return { error: "This command can only be used in channels." };
        }

        if (!voiceChannel) {
          // await send('Bạn cần phải ở trong một kênh voice để sử dụng lệnh này!');
          return { error: "You need to be in a voice channel to use this command." };
        }

        const player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild!.id);

        if (!player || !player.queue.current) {
          // await send('Không có bài hát nào đang phát để dừng.');
          return { error: "There is no song currently playing." };
        }

        player.data.set('autoplay', !player.data.get('autoplay'));

        // await send(
        //   'Tự động phát nhạc: ' + (player.data.get('autoplay') ? 'Bật' : 'Tắt') + '.',
        // );
        return { success: true, autoplay: player.data.get('autoplay') }
      }
    }),
    createFunctionHandler({
      name: "set_loop_state",
      description: "Set loop state.",
      schema: z.object({
        loop: z.enum(["none", "queue", "track"]),
      }),
      handler: async ({ loop }) => {
        const voiceChannel = ctx.message.member?.voice.channel;

        if (!ctx.message.client.user) return;

        if (!ctx.message.guild) {
          // await send('Lệnh chỉ có thể sử dụng trong máy chủ!');
          return { error: "This command can only be used in guilds." };
        }

        if (!ctx.message.channel) {
          // await send('Lệnh chỉ có thể sử dụng trong kênh voice!');
          return { error: "This command can only be used in channels." };
        }

        if (!voiceChannel) {
          // await send('Bạn cần phải ở trong một kênh voice để sử dụng lệnh này!');
          return { error: "You need to be in a voice channel to use this command." };
        }

        const player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild!.id);

        if (!player || !player.queue.current) {
          // await send('Không có bài hát nào đang phát để dừng.');
          return { error: "There is no song currently playing." };
        }

        if (!player) {
          // await send('Bot không kết nối với kênh voice.');
          return { error: "Bot is not connected to a voice channel." };
        }



        player.setLoop(loop);
        return { success: true, loop: player.loop }

      }
    }),
    createFunctionHandler({
      name: "get_loop_state",
      description: "Get loop state.",
      schema: z.object({}),
      handler: async () => {
        const voiceChannel = ctx.message.member?.voice.channel;

        if (!ctx.message.client.user) return;

        if (!ctx.message.guild) {
          // await send('Lệnh chỉ có thể sử dụng trong máy chủ!');
          return { error: "This command can only be used in guilds." };
        }

        if (!ctx.message.channel) {
          // await send('Lệnh chỉ có thể sử dụng trong kênh voice!');
          return { error: "This command can only be used in channels." };
        }
        const player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild!.id);

        if (!player) {
          return { error: "There is no song currently playing. Or bot is not connected to a voice channel" };
        }

        return { success: true, loop: player.loop }
      }
    }),
    createFunctionHandler({
      name: "now_playing",
      description: "Get now playing song.",
      schema: z.object({}),
      handler: async () => {
        const voiceChannel = ctx.message.member?.voice.channel;


        if (!ctx.message.client.user) return;

        if (!ctx.message.guild) {
          // await send('Lệnh chỉ có thể sử dụng trong máy chủ!');
          return { error: "This command can only be used in guilds." };
        }

        if (!ctx.message.channel) {
          // await send('Lệnh chỉ có thể sử dụng trong kênh voice!');
          return { error: "This command can only be used in channels." };
        }

        if (!voiceChannel) {
          // await send('Bạn cần phải ở trong một kênh voice để sử dụng lệnh này!');
          return { error: "You need to be in a voice channel to use this command." };
        }

        const player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild.id);

        if (!player) {
          // await send('Bot không kết nối với kênh voice.');
          return { error: "Bot is not connected to a voice channel." };
        }

        const queue = player.queue;
        const currentTrack = queue.current;

        if (!currentTrack) {
          // await send('Không có bài hát nào đang phát.');
          return { error: "There is no song currently playing." };
        }

        return { success: true, track: currentTrack, queueLength: queue.length }
      }
    }),
    createFunctionHandler({
      name: "pause",
      description: "Pause the music.",
      schema: z.object({}),
      handler: async () => {
        const voiceChannel = ctx.message.member?.voice.channel;

        if (!ctx.message.client.user) return;

        if (!ctx.message.guild) {
          // await send('Lệnh chỉ có thể sử dụng trong máy chủ!');
          return { error: "This command can only be used in guilds." };
        }

        if (!ctx.message.channel) {
          // await send('Lệnh chỉ có thể sử dụng trong kênh voice!');
          return { error: "This command can only be used in channels." };
        }

        if (!voiceChannel) {
          // await send('Bạn cần phải ở trong một kênh voice để sử dụng lệnh này!');
          return { error: "You need to be in a voice channel to use this command." };
        }

        const player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild!.id);

        if (!player || !player.queue.current) {
          // await send('Không có bài hát nào đang phát để dừng.');
          return { error: "There is no song currently playing." };
        }

        player.pause(true);

        return { success: true }
      }
    }),
    createFunctionHandler({
      name: "queue",
      description: "Get queue.",
      schema: z.object({}),
      handler: async () => {
        const voiceChannel = ctx.message.member?.voice.channel;

        if (!ctx.message.client.user) return;

        if (!ctx.message.guild) {
          // await send('Lệnh chỉ có thể sử dụng trong máy chủ!');
          return { error: "This command can only be used in guilds." };
        }

        if (!ctx.message.channel) {
          // await send('Lệnh chỉ có thể sử dụng trong kênh voice!');
          return { error: "This command can only be used in channels." };
        }

        if (!voiceChannel) {
          // await send('Bạn cần phải ở trong một kênh voice để sử dụng lệnh này!');
          return { error: "You need to be in a voice channel to use this command." };
        }

        const player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild!.id);

        if (!player || !player.queue.current) {
          // await send('Không có bài hát nào đang phát để dừng.');
          return { error: "There is no song currently playing." };
        }

        return { success: true, queue: player.queue }
      }
    }),
    createFunctionHandler({
      name: "resume",
      description: "Resume the music.",
      schema: z.object({}),
      handler: async () => {
        const voiceChannel = ctx.message.member?.voice.channel;

        if (!ctx.message.client.user) return;

        if (!ctx.message.guild) {
          // await send('Lệnh chỉ có thể sử dụng trong máy chủ!');
          return { error: "This command can only be used in guilds." };
        }

        if (!ctx.message.channel) {
          // await send('Lệnh chỉ có thể sử dụng trong kênh voice!');
          return { error: "This command can only be used in channels." };
        }

        if (!voiceChannel) {
          // await send('Bạn cần phải ở trong một kênh voice để sử dụng lệnh này!');
          return { error: "You need to be in a voice channel to use this command." };
        }

        const player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild!.id);

        if (!player || !player.queue.current) {
          // await send('Không có bài hát nào đang phát để dừng.');
          return { error: "There is no song currently playing." };
        }

        player.pause(false);

        return { success: true }
      }
    }),
    createFunctionHandler({
      name: "skip",
      description: "Skip the music.",
      schema: z.object({}),
      handler: async () => {
        const voiceChannel = ctx.message.member?.voice.channel;

        if (!ctx.message.client.user) return;

        if (!ctx.message.guild) {
          // await send('Lệnh chỉ có thể sử dụng trong máy chủ!');
          return { error: "This command can only be used in guilds." };
        }

        if (!ctx.message.channel) {
          // await send('Lệnh chỉ có thể sử dụng trong kênh voice!');
          return { error: "This command can only be used in channels." };
        }

        if (!voiceChannel) {
          // await send('Bạn cần phải ở trong một kênh voice để sử dụng lệnh này!');
          return { error: "You need to be in a voice channel to use this command." };
        }

        const player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild!.id);

        if (!player || !player.queue.current) {
          // await send('Không có bài hát nào đang phát để dừng.');
          return { error: "There is no song currently playing." };
        }
        player.skip()

        return { success: true }
      }
    }),
    createFunctionHandler({
      name: "stop",
      description: "Stop the music.",
      schema: z.object({}),
      handler: async () => {
        const voiceChannel = ctx.message.member?.voice.channel;

        if (!ctx.message.client.user) return;

        if (!ctx.message.guild) {
          // await send('Lệnh chỉ có thể sử dụng trong máy chủ!');
          return { error: "This command can only be used in guilds." };
        }

        if (!ctx.message.channel) {
          // await send('Lệnh chỉ có thể sử dụng trong kênh voice!');
          return { error: "This command can only be used in channels." };
        }

        if (!voiceChannel) {
          // await send('Bạn cần phải ở trong một kênh voice để sử dụng lệnh này!');
          return { error: "You need to be in a voice channel to use this command." };
        }

        const player = ctx.message.client.kazagumo.getPlayer(ctx.message.guild!.id);

        if (!player || !player.queue.current) {
          // await send('Không có bài hát nào đang phát để dừng.');
          return { error: "There is no song currently playing." };
        }

        player.destroy();

        return { success: true }
      }
    })
  ]
}
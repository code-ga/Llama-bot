import { EmbedBuilder, Client } from "discord.js";
import { getOpenAiClient } from "../lib/getOpenAiClient";
import { MODEL_NAME } from "../const";
import { createFunctionHandler, handleToolCalls, toTool } from "openai-zod-functions";
import z from "zod";
import type { ChatCompletionMessageParam } from "openai/resources";
import { inspect } from "util";

/**
 * Helper: tạo Embed thống nhất cho bot
 */
function createEmbed(description: string) {
  return new EmbedBuilder().setColor('#F8BBD0').setDescription(description);
}
const openai = getOpenAiClient()
export async function loadKazagumoEvents(client: Client) {
  // Shoukaku node events
  client.kazagumo.shoukaku.on('ready', (name) => console.info(`Lavalink ${name}: Ready!`));
  client.kazagumo.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error Caught,`, error));
  client.kazagumo.shoukaku.on('close', (name, code, reason) =>
    console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`)
  );
  client.kazagumo.shoukaku.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug,`, info));
  client.kazagumo.shoukaku.on('disconnect', (name, _count) => {
    const players = [...client.kazagumo.shoukaku.players.values()].filter((p) => p.node.name === name);
    players.map((player) => {
      client.kazagumo.destroyPlayer(player.guildId);
      player.destroy();
    });
    console.warn(`Lavalink ${name}: Disconnected`);
  });

  // Player events
  client.kazagumo.on('playerCreate', (player) => {
    console.debug(`Player created for guild ${player.guildId}`);
  });

  client.kazagumo.on('playerDestroy', (player) => {
    console.debug(`Player destroyed for guild ${player.guildId}`);
  });

  client.kazagumo.on('playerStart', async (player, track) => {
    if (!player.textId) return;
    const channel = client.channels.cache.get(player.textId);
    if (!channel || !channel.isSendable()) return;

    channel
      ?.send({
        embeds: [createEmbed(`Đang phát **${track.title}** bởi **${track.author}**`)]
      })
      .then((msg) => player.data.set('message', msg));
  });

  client.kazagumo.on('playerEnd', async (player) => {
    player.data.get('message')?.edit({ embeds: [createEmbed('Đã phát xong')] });
  });

  client.kazagumo.on('playerEmpty', async (player) => {
    const lastTrack = (player.queue.current || player.queue.previous[0])!;
    if (player.data.get('autoplay')) {
      const tools = [
        createFunctionHandler({
          name: "search",
          description: "Tìm kế tìm bài hát",
          schema: z.object({
            query: z.string()
          }),
          async handler(args) {
            const { query } = args;
            const result = await player.search(query);
            return result;
          }
        })
      ]
      let fullContent = ""
      const messages = [
        {
          role: 'system',
          content:
            'You are a music bot that plays music and suggests music (using the search function) and don\'t repeats of previous songs. You will always respond in the following format: { "track": { "title": "", "author": "" }, "url": "" }'
        },

        {
          role: 'assistant',
          content: `Previous songs:${player.queue.previous.map((x, i) => `${i}. **${x.title}** by **${x.author}**`).join('\n')}`
        },
        {
          role: 'user',
          content: `Now playing **${lastTrack.title}** by **${lastTrack.author}**. Can you suggest a song to play next?`
        }
      ] as ChatCompletionMessageParam[]
      while (true) {
        const completion = await openai.chat.completions.create({
          model: MODEL_NAME,
          messages,
          tools: tools.map(toTool),
        });
        if (!completion.choices[0]) {
          if (!player.textId) return;
          const channel = client.channels.cache.get(player.textId);
          if (!channel || !channel.isSendable()) return;
          channel?.send({ embeds: [createEmbed('Kazagumo has been destroyed due to inactivity.')] }).then((x) => player.data.set('message', x));
          return;
        }
        const { message: { tool_calls, content }, finish_reason } = completion.choices[0];
        if (tool_calls) {
          try {
            messages.push({ role: "assistant", tool_calls: tool_calls })
            const output = await handleToolCalls(tools, tool_calls);
            for (let i = 0; i < output.length; i++) {
              if (!output[i]) continue
              if (!tool_calls[i]) continue
              messages.push({ role: "tool", content: inspect(output[i], { depth: Infinity }), tool_call_id: tool_calls[i]?.id || "" });
            }
          } catch (error: any) {
            for (let i = 0; i < tool_calls.length; i++) {
              if (!tool_calls[i]) continue
              messages.push({ role: "tool", content: JSON.stringify({ ...error, message: error.message }), tool_call_id: tool_calls[i]?.id || "" });
            }
          }

          continue
        }
        if (content) {
          fullContent += content
          messages.push({ role: "assistant", content })
        }
        if (finish_reason === "stop") {
          break
        }
      }

      const aiContent = fullContent;
      const { track } = JSON.parse(aiContent);
      const result = await player.search(`${track.title} ${track.author}`, {
        requester: lastTrack.requester
      });
      if (!result.tracks.length) {
        player.destroy();
        if (!player.textId) return;
        const channel = client.channels.cache.get(player.textId);
        if (!channel || !channel.isSendable()) return;
        channel?.send({ embeds: [createEmbed('Destroyed player due to inactivity.')] }).then((x) => player.data.set('message', x));
        return;
      }
      if (result.type === 'PLAYLIST') player.queue.add(result.tracks);
      else player.queue.add(result.tracks[Math.floor(Math.random() * result.tracks.length)]!);
      if (!player.playing && !player.paused) player.play();
      return;
    }

    // No autoplay → destroy player
    player.destroy();
    if (!player.textId) return;
    const channel = client.channels.cache.get(player.textId);
    if (!channel || !channel.isSendable()) return;
    channel?.send({ embeds: [createEmbed('Đã dừng vì không hoạt động trong một khoảng thời gian.')] }).then((x) => player.data.set('message', x));
  });
}

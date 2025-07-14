import { OpenAI } from "openai";
import { ThreadAutoArchiveDuration, type Client, type Message } from "discord.js";
import type { ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionToolMessageParam } from "openai/resources";
import { inspect } from "util";
import { API_KEY, BASE_URL, MODEL_NAME } from "../const";
import { getSystemPrompt } from "../util/prompt";
import { handleToolCalls, toTool } from "openai-zod-functions";
import { Context, getDiscordTool, getMangadexTool, getMathTool, getMusicTool } from "../util/tool";



interface MessageHistory {
  messages: Array<ChatCompletionMessageParam>,
  loading: boolean
  requestUserId: string
}
const openai = new OpenAI({
  baseURL: BASE_URL,
  apiKey: API_KEY
});
function chunkString(str: string, chunkSize: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    result.push(str.slice(i, i + chunkSize));
  }
  return result;
}
/**
 * interesting stuff
 * - https://discord.com/developers/docs/resources/message#message-object-message-structure
 * - content,embeds,message_reference,components,attachments,channel_id,author,timestamp,mentions,mention_roles,mention_everyone,reactions
 */

async function replyLongMessage(content: string, replyMessages: Message[], replyMessage: Message) {
  if (content.length >= 2000) {
    const chunks = chunkString(content, 2000);
    // replyMessage.edit(chunks.shift()!);
    // for (const chunk of chunks) {
    //   await new Promise((resolve) => setTimeout(resolve, 1000));
    //   replyMessage.reply(chunk);
    // }
    for (let i = 0; i < chunks.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const replyContent = chunks[i]!
      if (replyMessages[i]) replyMessages[i]?.edit(replyContent)
      else replyMessages.push(await replyMessage.reply(replyContent))
    }
    if (replyMessages.length > chunks.length) {
      for (let i = chunks.length; i < replyMessages.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        replyMessages[i]?.delete()
      }
    }
  } else {
    replyMessage.edit(content)
  }
}

export const handleMessageCreate = async (client: Client, message: Message) => {

  const thread = message.channel.isThread() ? message.channel : await message.startThread({ name: "ChatGPT", autoArchiveDuration: ThreadAutoArchiveDuration.OneDay, });
  await thread.join();
  const replyMessage = message.channel.isThread() ? await message.reply(`<@${message.author.id}> loading...`) : await thread.send(`<@${message.author.id}> loading...`);
  const replyMessages = [replyMessage];

  const chats = await (async (): Promise<MessageHistory> => {
    const data = (await client.db.ref("chats").child(thread.id).get<MessageHistory>()).val();
    if (!data) {
      await client.db.ref("chats").child(thread.id).push<MessageHistory>({ messages: [], loading: false, requestUserId: message.author.id });
      return { messages: [], loading: false, requestUserId: message.author.id }
    }
    return data
  })();
  if (chats.loading) {
    replyMessage.edit("Something is running");
    return
  }
  console.log(chats, chats.requestUserId, message.author.id)
  if (chats.requestUserId !== message.author.id) {
    replyMessage.edit("Another request is running");
    return
  }
  await client.db.ref("chats").child(thread.id).update({ loading: true });

  const messages = [...chats.messages, { role: "user", content: message.content, name: `${message.author.username}#${message.author.discriminator} (${message.author.id})` } as ChatCompletionMessageParam];
  const ctx = new Context(client, message);
  const tools = [...getMathTool(ctx), ...getDiscordTool(ctx), ...getMangadexTool(ctx)] //...getMusicTool(client, message)

  let fullContent = ""
  // if (!response.choices[0]?.message.content) return

  // thread.send(response.choices[0].message.content);
  const interval = setInterval(() => {
    // console.log(fullContent)
    if (fullContent) {
      replyMessage.edit(fullContent.length >= 2000 ? fullContent.slice(fullContent.length - 2000) : fullContent);
    }
  }, 500);
  let finish_reason = ""
  while (finish_reason !== "stop") {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: "system", content: getSystemPrompt(client, message) }, ...messages],
      stream: true,
      tools: tools.map(toTool),
      tool_choice: "auto",
      parallel_tool_calls: true
    })
    for await (const chunk of response) {
      // console.log(chunk)
      console.log(chunk.choices[0]?.finish_reason)
      if (chunk.choices[0]?.delta.content) {
        fullContent += chunk.choices[0].delta.content
      }
      if (chunk.choices[0]?.delta.tool_calls) {
        const toolCall = chunk.choices[0].delta.tool_calls as ChatCompletionMessageToolCall[];
        const tool_calling_result = [] as ChatCompletionToolMessageParam[]
        console.log(inspect(toolCall, { depth: Infinity }))
        // handleToolCalls([...getMathTool(), ...getDiscordTool(client)], toolCall);
        try {
          const output = await handleToolCalls<any>(tools, toolCall);
          for (let i = 0; i < output.length; i++) {
            if (!output[i]) continue
            if (!toolCall[i]) continue
            tool_calling_result.push({ role: "tool", content: JSON.stringify(output[i]), tool_call_id: toolCall[i]?.id || "" });
          }
        } catch (error: any) {
          for (let i = 0; i < toolCall.length; i++) {
            if (!toolCall[i]) continue
            tool_calling_result.push({ role: "tool", content: JSON.stringify({ ...error, message: error.message }), tool_call_id: toolCall[i]?.id || "" });
          }
        }
        messages.push({ role: "assistant", tool_calls: toolCall })
        messages.push(...tool_calling_result)

        console.log(inspect(tool_calling_result, { depth: Infinity }))
        break
      }
      if (chunk.choices[0]?.delta.content === "</think>") {
        fullContent = ""
      };

      if (chunk.choices[0]?.finish_reason === "stop") {


        finish_reason = chunk.choices[0].finish_reason
        break
      }
    }
  }
  clearInterval(interval);
  // console.log(fullContent)
  replyLongMessage(fullContent, replyMessages, replyMessage);

  await client.db.ref("chats").child(thread.id).update(
    {
      messages: [...messages, { role: "assistant", content: fullContent } as ChatCompletionMessageParam],
      loading: false,
      requestUserId: message.author.id
    },
  );
}
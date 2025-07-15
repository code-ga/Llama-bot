import { ChannelType, ThreadAutoArchiveDuration, type Channel, type Client, type Message } from "discord.js";
import { handleToolCalls, toTool } from "openai-zod-functions";
import type { ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionToolMessageParam } from "openai/resources";
import { inspect } from "util";
import { MODEL_NAME } from "../const";
import { getOpenAiClient } from "../lib/getOpenAiClient";
import { getSystemPrompt } from "../util/prompt";
import { Context, getTool } from "../util/tool";



interface MessageHistory {
  messages: Array<ChatCompletionMessageParam>,
  loading: boolean
  requestUserId: string
}
const openai = getOpenAiClient();
function chunkString(str: string, chunkSize: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    result.push(str.slice(i, i + chunkSize));
  }
  return result;
}

function removeToolCalls(messages: Array<ChatCompletionMessageParam>) {
  const result: Array<ChatCompletionMessageParam> = [];
  for (const message of messages) {
    if (message.role === "function") continue
    if (message.role === "tool") continue
    if (message.role == "assistant" && message.tool_calls) continue
    result.push(message)
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
// channel can create thread
const canCreateThread = (channel: Channel) => {
  if (channel.isThread()) return false
  if (channel.isDMBased()) return false
  if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) { return false }
  return channel.permissionsFor(channel.client.user)?.has("CreatePublicThreads")
}
export const handleMessageCreate = async (client: Client, message: Message) => {
  if (!message.channel.isThread() && !canCreateThread(message.channel)) {
    await message.reply("Bot don't have permission to create thread");
    return
  }
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

  const messages = [...chats.messages, { role: "user", content: message.content, name: `${message.author.username}-${message.author.id}` } as ChatCompletionMessageParam];
  const ctx = new Context(client, message, thread);
  const tools = getTool(ctx)

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
  while (finish_reason !== "stop" && finish_reason !== "content_filter" && finish_reason !== "length") {
    try {

      const response = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [{ role: "system", content: getSystemPrompt(client, message) }, ...messages],
        stream: true,
        tools: tools.map(toTool),
        // tool_choice: "auto",
      })
      // console.log(JSON.stringify(response.choices, null, 2))
      // for await (const chunk of response) {
      //   console.log(JSON.stringify(chunk.choices[0]))
      // }
      // return
      const toolUse = [] as ChatCompletionMessageToolCall[]
      for await (const chunk of response) {
        // console.log(chunk)
        // console.log(chunk.choices[0])
        if (!chunk.choices[0]) continue
        if (chunk.choices[0].delta.content) {
          fullContent += chunk.choices[0].delta.content
        }
        if (chunk.choices[0]?.delta.tool_calls) {
          const toolCalls = chunk.choices[0]?.delta.tool_calls!
          // console.log(toolCalls)
          for (const toolCall of toolCalls) {
            const tool = toolUse[toolCall.index]
            if (!tool) {
              toolUse[toolCall.index] = {
                type: toolCall.type!,
                id: toolCall.id!,
                function: {
                  name: toolCall.function?.name!,
                  arguments: toolCall.function?.arguments!
                },
              }
              continue
            }
            tool.function.arguments = (tool?.function.arguments || "") + (toolCall.function?.arguments || "")
          }
        }
        if (chunk.choices[0]?.delta.content === "</think>") {
          fullContent = ""
        };

        if (chunk.choices[0]?.finish_reason === "stop") {
          finish_reason = chunk.choices[0].finish_reason
          break
        } else if (chunk.choices[0]?.finish_reason === "length") {
          finish_reason = chunk.choices[0].finish_reason
          break
        } else if (chunk.choices[0]?.finish_reason === "content_filter") {
          finish_reason = chunk.choices[0].finish_reason
          break
        } else if (chunk.choices[0]?.finish_reason === "tool_calls") {
          const tool_calling_result = [] as ChatCompletionToolMessageParam[]
          console.log(inspect(toolUse, { depth: Infinity }))
          // handleToolCalls([...getMathTool(), ...getDiscordTool(client)], toolCall);
          replyMessage.edit(("Using tools: ```" + JSON.stringify(toolUse) + "```").slice(0, 1999))
          try {
            const output = await handleToolCalls<any>(tools, toolUse);
            for (let i = 0; i < output.length; i++) {
              if (!output[i]) continue
              if (!toolUse[i]) continue
              tool_calling_result.push({ role: "tool", content: inspect(output[i], { depth: Infinity }), tool_call_id: toolUse[i]?.id || "" });
            }
          } catch (error: any) {
            for (let i = 0; i < toolUse.length; i++) {
              if (!toolUse[i]) continue
              tool_calling_result.push({ role: "tool", content: JSON.stringify({ ...error, message: error.message }), tool_call_id: toolUse[i]?.id || "" });
            }
          }
          messages.push({ role: "assistant", tool_calls: toolUse })
          replyMessage.edit(("```" + JSON.stringify(tool_calling_result) + "```").slice(0, 2000))
          for (let i = 0; i < tool_calling_result.length; i++) {
            const result = tool_calling_result[i]
            if (!result) continue
            messages.push(result)
          }

          console.log(inspect(tool_calling_result, { depth: Infinity }))
        }
      }
    } catch (error: any) {
      console.error(inspect(error));
      replyMessage.edit("```" + error.message + "```")
      break
    }
  }
  clearInterval(interval);
  // console.log(fullContent)
  if (fullContent) {
    replyLongMessage(fullContent, replyMessages, replyMessage);

    await client.db.ref("chats").child(thread.id).update(
      {
        messages: removeToolCalls([...messages, { role: "assistant", content: fullContent } as ChatCompletionMessageParam]),
        loading: false,
        requestUserId: message.author.id
      },
    );
  }
}
import type { Client, Message } from "discord.js";
export async function checkBotShouldReply( client: Client, messageContent: Message) {
  if (!client.user) return false
  if (!messageContent.mentions.users.has(client.user.id)) return false
  return true
}
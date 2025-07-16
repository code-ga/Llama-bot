import { type Client, type Message, type PrivateThreadChannel, type PublicThreadChannel } from "discord.js";
import { getDiscordTool } from "./discordTool";
import { WibuTool } from "./WibuTool";
import { getMusicTool } from "./musicTool";
import { getMathTool } from "./otherTool";

export class Context {
  constructor(public client: Client, public message: Message, public thread: PublicThreadChannel<boolean> | PrivateThreadChannel) { }
}

export const getTool = (ctx: Context) => {
  const functions = [...getMathTool(ctx), ...getDiscordTool(ctx), ...WibuTool(ctx), ...getMusicTool(ctx)]

  return functions
}
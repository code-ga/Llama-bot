import { Client, DiscordAPIError, GatewayIntentBits, Partials } from 'discord.js';
import { DISCORD_TOKEN } from './const';
import { handleMessageCreate } from './handle/messageCreate';
import { checkBotShouldReply } from './util/checkBotShouldReply';
import Bot from './Bot';
import { loadKazagumoEvents } from './handle/kazagumoEvent';




const client = new Bot({
  discord: {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.DirectMessagePolls,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.DirectMessageReactions,
    ],
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.User,
      Partials.Message,
      Partials.Reaction,
    ],
  },
  acebase: {
    type: "local",
    databaseName: "no_idea",
  }
});
loadKazagumoEvents(client);
client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!await checkBotShouldReply(client, message)) return
  handleMessageCreate(client, message);

});

process.on('unhandledRejection', (reason, promise) => {
  10008
  // Bỏ qua riêng lỗi thiếu quyền 50013 
  if (reason instanceof DiscordAPIError && reason.code === 50013) return;

  // Các lỗi khác vẫn báo
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  if (error instanceof DiscordAPIError && error.code === 50013) return;


  console.error('Uncaught Exception:', error);
});

process.on("SIGINT", async () => {
  process.exit(0);
});

process.on("SIGTERM", async () => {
  process.exit(0);
});


client.login(DISCORD_TOKEN);
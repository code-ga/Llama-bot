import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { DISCORD_TOKEN } from './const';
import { handleMessageCreate } from './handle/messageCreate';
import { checkBotShouldReply } from './util/checkBotShouldReply';
import Bot from './Bot';




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
client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!await checkBotShouldReply(client, message)) return
  handleMessageCreate(client, message);

});

client.login(DISCORD_TOKEN);
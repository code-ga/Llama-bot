# IntelligentBot

A powerful and intelligent Discord bot built with TypeScript, Discord.js, and OpenAI.

## Features

- **AI-Powered Conversations:** Engage in natural conversations with the bot, powered by OpenAI's GPT models.
- **Music Playback:** Play music from YouTube and other sources directly in your voice channels.
- **Manga Search:** Search for manga information from MangaDex.
- **Anime GIF Reactions:** Spice up your conversations with anime GIFs.
- **Discord Integration:** Get information about users, channels, guilds, and messages.
- **Math Calculations:** Perform mathematical calculations.
- **Extensible Tool System:** Easily add new tools and functionalities to the bot.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/)
- [Lavalink Server](https://github.com/lavalink-devs/Lavalink)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/code-ga/IntelligentBot.git
    cd IntelligentBot
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add the following variables:
    ```
    BASE_URL=
    API_KEY=
    MODEL_NAME=
    DISCORD_TOKEN=
    ```

4.  **Configure Lavalink:**
    Rename `lavalink.config.ts.example` to `lavalink.config.ts` and configure your Lavalink server details.

## Usage

1.  **Start the bot:**
    ```bash
    bun start
    ```

2.  **Invite the bot to your Discord server.**

3.  **Mention the bot in a channel to start a conversation.**

## Deployment

To deploy the bot, you can use a process manager like PM2 to keep it running in the background.

1.  **Install PM2:**
    ```bash
    npm install -g pm2
    ```

2.  **Start the bot with PM2:**
    ```bash
    pm2 start "bun start" --name IntelligentBot
    ```

You can also deploy the bot to a cloud platform like Heroku or a VPS.
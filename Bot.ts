import { AceBase } from "acebase";
import { AceBaseClient, type AceBaseClientConnectionSettings } from "acebase-client";
import { Client, type ClientOptions } from "discord.js";

interface AceBaseLocalOptions {
  type: "local";
  databaseName: string;
}

interface AceBaseClientOptions extends AceBaseClientConnectionSettings {
  type: "client";
}



interface BotOptions {
  discord: ClientOptions;
  acebase: AceBaseLocalOptions | AceBaseClientOptions;

}

export default class Bot<Ready extends boolean = boolean> extends Client<Ready> {
  db: AceBase | AceBaseClient;
  constructor(options: BotOptions) {
    super(options.discord);

    if (options.acebase.type === "local") this.db = new AceBase(options.acebase.databaseName, { storage: { removeVoidProperties: true, path: "." } });
    else if (options.acebase.type === "client") this.db = new AceBaseClient(options.acebase);
    else this.db = new AceBase("bot");





  }
}
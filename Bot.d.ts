import { AceBase } from "acebase";
import { AceBaseClient } from "acebase-client";

declare module "discord.js" {
  export interface Client {
    db: AceBase | AceBaseClient;
  }
}
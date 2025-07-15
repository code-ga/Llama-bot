import { AceBase } from "acebase";
import { AceBaseClient } from "acebase-client";
import { Kazagumo } from "kazagumo";

declare module "discord.js" {
  export interface Client {
    db: AceBase | AceBaseClient;
    kazagumo: Kazagumo
  }
}
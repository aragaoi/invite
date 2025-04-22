import inquirer from "inquirer";
import open from "open";
import fs from "fs/promises";
import { ContactParser } from "./contacts/ContactParser.js";
import { ContactMatcher } from "./contacts/ContactMatcher.js";
import { MessageBuilder } from "./messages/MessageBuilder.js";
import path from "path";
import { InvitationBuilder } from "./invitation/InvitationBuilder.js";

export { InvitationBuilder };

async function main() {
  try {
    const invitationBuilder = new InvitationBuilder();
    const htmlPath = await invitationBuilder.start();
    console.log("\nPress any key to open the browser...");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", async () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      await open(htmlPath);
    });
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();

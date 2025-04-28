import open from "open";
import { InvitationBuilder } from "./invitation/InvitationBuilder.js";

export { InvitationBuilder };

async function main() {
  try {
    const invitationBuilder = new InvitationBuilder();
    const htmlPath = await invitationBuilder.start();
    await open(htmlPath);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();

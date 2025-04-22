import inquirer from "inquirer";
import open from "open";
import fs from "fs/promises";
import { ContactParser } from "./contacts/ContactParser.js";
import { ContactMatcher } from "./contacts/ContactMatcher.js";
import { MessageBuilder } from "./messages/MessageBuilder.js";
import path from "path";

class InvitationBuilder {
  constructor() {
    this.contactParser = new ContactParser();
    this.messageBuilder = new MessageBuilder();
  }

  async start() {
    try {
      const contacts = await this.contactParser.loadContactsFromDirectory();
      const contactMatcher = new ContactMatcher(contacts);

      const names = await this.readNames();

      const [individualMessage, groupMessage] = await Promise.all([
        this.readMessage("data/individual_message.txt"),
        this.readMessage("data/group_message.txt"),
      ]);

      const { matches, skipped } = await this.findAndConfirmMatches(
        names,
        contactMatcher
      );
      const htmlContent = this.generateHtml(
        matches,
        skipped,
        individualMessage,
        groupMessage
      );

      await fs.mkdir("dist", { recursive: true });
      await fs.writeFile("dist/index.html", htmlContent);

      console.log("\nPress any key to open the browser...");
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", async () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        const htmlPath = path.resolve("dist/index.html");
        await open(htmlPath);
      });
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  async readNames() {
    const content = await fs.readFile("data/names.txt", "utf-8");
    return content
      .split("\n")
      .filter((line) => line.trim())
      .map((name) => name.trim());
  }

  async readMessage(filePath) {
    const content = await fs.readFile(filePath, "utf-8");
    return content.trim();
  }

  async findAndConfirmMatches(names, contactMatcher) {
    const matches = [];
    const skipped = [];

    const groupMatches = [];

    for (const name of names) {
      const probableMatches = contactMatcher.findMatches(name);

      if (probableMatches.length === 0) {
        console.log(`No matches found for ${name}`);
        skipped.push({ name, reason: "No matches found" });
        continue;
      }

      const choices = [];
      for (const match of probableMatches) {
        if (match.phones.length === 1) {
          choices.push({
            name: `${match.name} (${match.phones[0]}) - Confidence: ${match.confidence}`,
            value: { ...match, phone: match.phones[0], originalName: name },
          });
        } else {
          choices.push(new inquirer.Separator(match.name));
          choices.push(
            ...match.phones.map((phone) => ({
              name: `  ${phone} - Confidence: ${match.confidence}`,
              value: { ...match, phone, originalName: name },
            }))
          );
        }
      }

      const { selectedContact } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedContact",
          message: `Select contact for "${name}":`,
          choices: [
            ...choices,
            new inquirer.Separator(),
            {
              name: "Skip this invite",
              value: null,
            },
          ],
        },
      ]);

      if (selectedContact === null) {
        skipped.push({ name, reason: "Skipped by user" });
        continue;
      }

      if (groupMatches.length > 0) {
        matches.push({
          isGroup: name.split(" e ").length > 1,
          contacts: groupMatches,
        });
      }
    }

    return { matches, skipped };
  }

  generateHtml(matches, skipped, individualMessage, groupMessage) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp Invitations</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .invitation { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
        .opened { color: #888; text-decoration: line-through; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .message-input { width: 100%; margin: 10px 0; padding: 5px; }
        .number-input { width: 200px; margin: 5px 0; padding: 5px; }
        .number { font-weight: bold; margin-right: 10px; }
        .preview { margin: 5px 0; padding: 5px; background: #f5f5f5; }
        .contact { margin: 5px 0; }
        .original-name { color: #666; font-style: italic; }
        .skipped { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; }
        .skipped h2 { color: #666; }
        .skipped ul { list-style-type: none; padding-left: 0; }
        .skipped li { margin: 5px 0; color: #888; }
    </style>
</head>
<body>
    <h1>WhatsApp Invitations</h1>
    <ol>
    ${matches
      .map((match, index) => {
        const message = match.isGroup ? groupMessage : individualMessage;
        const phones = match.contacts.map((m) => m.phone);
        const formattedMessage = match.isGroup
          ? message.replace(
              "{names}",
              match.contacts.map((c) => c.originalName).join(", ")
            )
          : message.replace("{name}", match.contacts[0].originalName);
        const url = match.isGroup
          ? `https://wa.me/${phones.join(",")}?text=${encodeURIComponent(formattedMessage)}`
          : `https://wa.me/${phones[0]}?text=${encodeURIComponent(formattedMessage)}`;

        return `
        <li class="invitation">
            <h2>Invitation ${index + 1}</h2>
            <div class="contacts">
              ${match.contacts
                .map(
                  (contact, contactIndex) => `
                <div class="contact">
                  <span class="original-name">${contact.originalName}</span>
                  <span> → ${contact.name}</span>
                  <input type="text" class="number-input" value="${contact.phone}" 
                         onchange="updatePhone(${index}, ${contactIndex}, this.value)">
                </div>
              `
                )
                .join("")}
            </div>
            <p>Message: <input type="text" class="message-input" value="${message}" onchange="updateLink(this, ${index})"></p>
            <div class="preview" id="preview-${index}">${formattedMessage}</div>
            <a href="${url}" onclick="markAsOpened(this)" data-index="${index}" id="link-${index}" target="_blank">Open WhatsApp</a>
        </li>
    `;
      })
      .join("")}
    </ol>
    ${
      skipped.length > 0
        ? `
    <div class="skipped">
      <h2>Skipped Names</h2>
      <ul>
        ${skipped
          .filter((skip) => skip.reason === "Skipped by user")
          .map(
            (skip) => `
          <li>${skip.name}</li>
        `
          )
          .join("")}
      </ul>
      <h2>Not Found Names</h2>
      <ul>
        ${skipped
          .filter((skip) => skip.reason === "No matches found")
          .map(
            (skip) => `
          <li>${skip.name}</li>
        `
          )
          .join("")}
      </ul>
    </div>
    `
        : ""
    }
    <script>
        const matches = ${JSON.stringify(matches)};
        const individualMessage = ${JSON.stringify(individualMessage)};
        const groupMessage = ${JSON.stringify(groupMessage)};

        function formatMessage(message, contacts) {
            if (contacts.length === 1) {
                return message.replace('{name}', contacts[0].originalName);
            }
            return message.replace('{names}', contacts.map(c => c.originalName).join(', '));
        }

        function updatePhone(matchIndex, contactIndex, newPhone) {
            matches[matchIndex].contacts[contactIndex].phone = newPhone;
            const messageInput = document.querySelector('#link-' + matchIndex).previousElementSibling.previousElementSibling.querySelector('input');
            updateLink(messageInput, matchIndex);
        }

        function updateLink(input, index) {
            const link = document.getElementById('link-' + index);
            const preview = document.getElementById('preview-' + index);
            const match = matches[index];
            const message = input.value;
            
            const phones = match.contacts.map(m => m.phone);
            const formattedMessage = formatMessage(message, match.contacts);
            
            const url = match.isGroup
                ? 'https://wa.me/' + phones.join(',') + '?text=' + encodeURIComponent(formattedMessage)
                : 'https://wa.me/' + phones[0] + '?text=' + encodeURIComponent(formattedMessage);
            
            link.setAttribute('href', url);
            preview.textContent = formattedMessage;
        }

        function markAsOpened(element) {
            element.classList.add('opened');
        }
    </script>
</body>
</html>
    `;
    return html;
  }
}

const builder = new InvitationBuilder();
builder.start();

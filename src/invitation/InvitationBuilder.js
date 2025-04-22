import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";
import { ContactParser } from "../contacts/ContactParser.js";
import { ContactMatcher } from "../contacts/ContactMatcher.js";
import { MessageBuilder } from "../messages/MessageBuilder.js";
import readline from "readline";

export class InvitationBuilder {
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

      return path.resolve("dist/index.html");
    } catch (error) {
      console.error("Error:", error.message);
      throw error;
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
    const probableMatches = [];
    const skipped = [];

    for (const name of names) {
      const isGroup = name.includes(" e ") || name.includes(",");
      const groupNames = isGroup
        ? name.split(/ e |, /).map((n) => n.trim())
        : [name];

      const groupContacts = [];
      for (const groupName of groupNames) {
        const contacts = await contactMatcher.findMatches(groupName);
        if (contacts.length === 0) {
          console.log(`No matches found for ${groupName}`);
          skipped.push({ name: groupName, reason: "No matches found" });
          continue;
        }

        if (contacts.length === 1) {
          groupContacts.push({
            ...contacts[0],
            phone: contacts[0].phones[0],
          });
          continue;
        }

        const probableMatch = contacts.find(
          (contact) =>
            contact.name.toLowerCase() === groupName.toLowerCase() ||
            contact.name.toLowerCase().includes(groupName.toLowerCase()) ||
            groupName.toLowerCase().includes(contact.name.toLowerCase())
        );

        if (probableMatch) {
          groupContacts.push({
            ...probableMatch,
            phone: probableMatch.phones[0],
          });
          continue;
        }

        probableMatches.push({
          name: groupName,
          contacts: contacts.map((contact) => ({
            ...contact,
            phone: contact.phones[0],
          })),
          isGroup: true,
        });
      }

      if (groupContacts.length > 0) {
        matches.push({
          name,
          contacts: groupContacts,
          isGroup,
        });
      }
    }

    if (probableMatches.length > 0) {
      console.log("\nProbable matches found:");
      for (const match of probableMatches) {
        console.log(`\nFor name: ${match.name}`);
        const selectedIndexes = await this.promptForSelection(match.contacts);

        if (selectedIndexes.includes(0)) {
          skipped.push({ name: match.name, reason: "Skipped by user" });
          continue;
        }

        const selectedContacts = selectedIndexes
          .filter((index) => index > 0)
          .map((index) => match.contacts[index - 1]);

        if (selectedContacts.length > 0) {
          matches.push({
            name: match.name,
            contacts: selectedContacts,
            isGroup: match.isGroup,
          });
        } else {
          skipped.push({ name: match.name, reason: "Skipped by user" });
        }
      }
    }

    return { matches, skipped };
  }

  async promptForSelection(contacts) {
    const choices = [
      ...contacts.map((contact, index) => ({
        name: contact.phone
          ? `${contact.name} - ${contact.phone}`
          : `${contact.name} (no phone number)`,
        value: index + 1,
        disabled: !contact.phone,
      })),
      new inquirer.Separator(),
      {
        name: "Skip this contact",
        value: 0,
      },
    ];

    const { selectedIndexes } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedIndexes",
        message: "Select contacts (use space to select, enter to confirm):",
        choices,
        validate: (answer) => {
          if (answer.length === 0) {
            return "You must choose at least one option or skip.";
          }
          return true;
        },
      },
    ]);

    return selectedIndexes;
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
    <script>
        function updatePhone(invitationIndex, contactIndex, newPhone) {
            const link = document.getElementById(\`link-\${invitationIndex}-\${contactIndex}\`);
            const text = link.href.split('text=')[1];
            link.href = \`https://wa.me/\${newPhone}?text=\${text}\`;
        }

        function updateLink(input, index) {
            const message = input.value;
            const contacts = document.querySelectorAll(\`#invitation-\${index} .contact\`);
            const allNames = document.querySelector(\`#invitation-\${index} .original-group-name\`).textContent;
            
            contacts.forEach((contact, contactIndex) => {
                const link = document.getElementById(\`link-\${index}-\${contactIndex}\`);
                const preview = document.getElementById(\`preview-\${index}-\${contactIndex}\`);
                const phone = link.href.split('wa.me/')[1].split('?')[0];
                const newMessage = message.replace('{names}', allNames);
                preview.textContent = newMessage;
                link.href = \`https://wa.me/\${phone}?text=\${encodeURIComponent(newMessage)}\`;
            });
        }

        function markAsOpened(link) {
            link.parentElement.classList.add('opened');
        }
    </script>
</head>
<body>
    <h1>WhatsApp Invitations</h1>
    <ol>
    ${matches
      .map((match, index) => {
        const message = match.isGroup ? groupMessage : individualMessage;
        const formattedMessage = match.isGroup
          ? message.replace("{names}", match.name)
          : message.replace("{name}", match.contacts[0].name);
        const url = match.isGroup
          ? match.contacts.map(
              (contact) =>
                `https://wa.me/${contact.phone}?text=${encodeURIComponent(
                  formattedMessage
                )}`
            )
          : match.contacts.map(
              (contact) =>
                `https://wa.me/${contact.phone}?text=${encodeURIComponent(formattedMessage)}`
            );

        return `
        <li class="invitation" id="invitation-${index}">
            <h2>Invitation ${index + 1}</h2>
            <div class="contacts">
              <span class="original-group-name" style="display: none">${match.name}</span>
              ${match.contacts
                .map(
                  (contact, contactIndex) => `
                <div class="contact">
                  <span class="original-name">${match.name}</span>
                  <span> → ${contact.name}</span>
                  <input type="text" class="number-input" value="${contact.phone}" 
                         onchange="updatePhone(${index}, ${contactIndex}, this.value)">
                  <p>Message: <input type="text" class="message-input" value="${message}" onchange="updateLink(this, ${index})"></p>
                  <div class="preview" id="preview-${index}-${contactIndex}">${formattedMessage}</div>
                  <a href="${url[contactIndex]}" onclick="markAsOpened(this)" data-index="${index}" id="link-${index}-${contactIndex}" target="_blank">Open WhatsApp</a>
                </div>
              `
                )
                .join("")}
            </div>
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
              .filter((s) => s.reason === "Skipped by user")
              .map((s) => `<li>${s.name}</li>`)
              .join("")}
        </ul>
        <h2>Not Found Names</h2>
        <ul>
            ${skipped
              .filter((s) => s.reason === "No matches found")
              .map((s) => `<li>${s.name}</li>`)
              .join("")}
        </ul>
    </div>`
        : ""
    }
</body>
</html>`;

    return html;
  }
}

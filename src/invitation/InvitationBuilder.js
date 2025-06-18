import fs from "fs/promises";
import path from "path";
import { ContactParser } from "../contacts/ContactParser.js";
import { ContactMatcher } from "../contacts/ContactMatcher.js";
import { MessageBuilder } from "../messages/MessageBuilder.js";

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
    const skipped = [];

    // Get separators from environment variable or use defaults
    const separators = process.env.GROUP_SEPARATORS
      ? process.env.GROUP_SEPARATORS.split("|").map((s) => s.trim())
      : [",", " e "];

    for (const originalName of names) {
      const isGroup = separators.some((sep) => originalName.includes(sep));
      const groupNames = isGroup
        ? originalName
            .split(
              new RegExp(
                separators
                  .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
                  .join("|")
              )
            )
            .map((n) => n.trim())
        : [originalName];

      const groupContacts = [];
      for (const rawName of groupNames) {
        const name = rawName.replace(/\s*\(.*\)\s*/, ""); // Remove parenthesized text

        const contacts = await contactMatcher.findMatches(name);
        if (contacts.length === 0) {
          console.log(`No matches found for ${name}`);
          skipped.push({ name: name, reason: "No matches found" });
          continue;
        }

        // Use all matches
        groupContacts.push(...contacts);
      }

      if (groupContacts.length > 0) {
        matches.push({
          name: originalName,
          contacts: groupContacts,
          isGroup,
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
        .skipped-invitation { background-color: #f8f9fa; }
        .skipped-flag { 
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            margin-left: 10px;
            background-color: #f8d7da;
            color: #721c24;
        }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        a:disabled { color: #ccc; pointer-events: none; }
        .message-textarea { 
            width: 100%; 
            margin: 10px 0; 
            padding: 5px;
            min-height: 100px;
            font-family: inherit;
            resize: vertical;
        }
        .name-input { width: 200px; margin: 5px 0; padding: 5px; }
        .number-input { width: 200px; margin: 5px 0; padding: 5px; }
        .number { font-weight: bold; margin-right: 10px; }
        .preview { 
            margin: 5px 0; 
            padding: 5px; 
            background: #f5f5f5;
            white-space: pre-wrap;
        }
        .contact { margin: 5px 0; }
        .original-name { color: #666; font-style: italic; }
        .skipped { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; }
        .skipped h2 { color: #666; }
        .skipped ul { list-style-type: none; padding-left: 0; }
        .skipped li { margin: 5px 0; color: #888; }
        .phone-options { margin: 5px 0; }
        .phone-option { margin: 5px 0; }
        .phone-option input { margin-right: 5px; }
        .group-names { margin: 10px 0; }
        .group-name { margin-right: 10px; }
        .contact-phones { margin-left: 20px; }
        .confidence { 
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            margin-left: 10px;
        }
        .confidence.high { background-color: #d4edda; color: #155724; }
        .confidence.medium { background-color: #fff3cd; color: #856404; }
        .confidence.low { background-color: #f8d7da; color: #721c24; }
        .whatsapp-links { margin-top: 10px; }
        .whatsapp-link { margin-right: 10px; }
        .skip-button { 
            margin-left: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            cursor: pointer;
        }
        .skip-button:hover {
            background-color: #f5c6cb;
        }
        .invitation-content { display: block; }
        .skipped-invitation .invitation-content { display: none; }
        .skipped-invitation .skipped-content { display: block; }
        .skipped-content { display: none; }
    </style>
    <script>
        // Utility functions
        function formatPhoneNumber(phone) {
            // Remove all non-digit characters
            const cleaned = phone.replace(/\D/g, '');
            
            // Format Brazilian numbers (assuming 55 is the country code)
            if (cleaned.startsWith('55')) {
                const countryCode = cleaned.substring(0, 2);
                const areaCode = cleaned.substring(2, 4);
                const firstPart = cleaned.substring(4, 9);
                const secondPart = cleaned.substring(9);
                return \`\${countryCode} \${areaCode} \${firstPart}-\${secondPart}\`;
            }
            
            // Default format for other numbers
            return phone;
        }

        function encodeMessageForWhatsApp(message) {
            // First encode the message
            const encoded = encodeURIComponent(message);
            
            // Replace %20 with + for better URL readability
            const withSpaces = encoded.replace(/%20/g, '+');
            
            // Handle newlines
            return withSpaces.replace(/%0A/g, '%0A');
        }

        // Storage functions
        function getOpenedLinks() {
            const opened = localStorage.getItem('openedLinks');
            return opened ? JSON.parse(opened) : [];
        }

        function saveOpenedLinks(links) {
            localStorage.setItem('openedLinks', JSON.stringify(links));
        }

        function getSelectedContacts() {
            const selected = localStorage.getItem('selectedContacts');
            return selected ? JSON.parse(selected) : {};
        }

        function saveSelectedContacts(selected) {
            localStorage.setItem('selectedContacts', JSON.stringify(selected));
        }

        function getEditedNames() {
            const edited = localStorage.getItem('editedNames');
            return edited ? JSON.parse(edited) : {};
        }

        function saveEditedNames(edited) {
            localStorage.setItem('editedNames', JSON.stringify(edited));
        }

        function getSkippedInvitations() {
            const skipped = localStorage.getItem('skippedInvitations');
            return skipped ? JSON.parse(skipped) : [];
        }

        function saveSkippedInvitations(skipped) {
            localStorage.setItem('skippedInvitations', JSON.stringify(skipped));
        }

        function skipInvitation(index) {
            const invitation = document.getElementById(\`invitation-\${index}\`);
            const skippedInvitations = getSkippedInvitations();
            
            if (skippedInvitations.includes(index)) {
                // Unskip
                const newSkipped = skippedInvitations.filter(i => i !== index);
                saveSkippedInvitations(newSkipped);
                invitation.classList.remove('skipped-invitation');
            } else {
                // Skip
                skippedInvitations.push(index);
                saveSkippedInvitations(skippedInvitations);
                invitation.classList.add('skipped-invitation');
            }
        }

        function updateLink(input, index) {
            const message = input.value;
            const invitation = document.getElementById(\`invitation-\${index}\`);
            const editedNames = getEditedNames();
            const originalName = invitation.querySelector('.original-group-name').textContent;
            const currentNames = editedNames[originalName] || originalName;
            const isGroup = message.includes('{names}');
            const newMessage = isGroup 
                ? message.replace('{names}', currentNames)
                : message.replace('{name}', currentNames);
            
            invitation.querySelector('.preview').textContent = newMessage;
            
            const links = invitation.querySelectorAll('.whatsapp-link');
            links.forEach(link => {
                if (link && link.href) {
                    const phoneMatch = link.href.match(/phone=([^&]+)/);
                    if (phoneMatch && phoneMatch[1]) {
                        const phone = phoneMatch[1];
                        link.href = \`https://wa.me/\${phone}?text=\${encodeMessageForWhatsApp(newMessage)}\`;
                    }
                }
            });
        }

        function updateNames(input, index) {
            const invitation = document.getElementById(\`invitation-\${index}\`);
            const originalName = invitation.querySelector('.original-group-name').textContent;
            const editedNames = getEditedNames();
            editedNames[originalName] = input.value;
            saveEditedNames(editedNames);
            
            // Update message preview
            const messageInput = invitation.querySelector('.message-textarea');
            updateLink(messageInput, index);
        }

        function markAsOpened(link) {
            const originalName = link.closest('.invitation').querySelector('.original-group-name').textContent;
            const openedLinks = getOpenedLinks();
            if (!openedLinks.includes(originalName)) {
                openedLinks.push(originalName);
                saveOpenedLinks(openedLinks);
            }
            link.closest('.invitation').classList.add('opened');
        }

        function handleContactSelection(checkbox, index) {
            const selectedContacts = getSelectedContacts();
            const invitation = document.getElementById(\`invitation-\${index}\`);
            const originalName = invitation.querySelector('.original-group-name').textContent;
            const phone = checkbox.value;
            
            if (!selectedContacts[originalName]) {
                selectedContacts[originalName] = [];
            }
            
            if (checkbox.checked) {
                if (!selectedContacts[originalName].includes(phone)) {
                    selectedContacts[originalName].push(phone);
                }
            } else {
                selectedContacts[originalName] = selectedContacts[originalName].filter(p => p !== phone);
                if (selectedContacts[originalName].length === 0) {
                    delete selectedContacts[originalName];
                }
            }
            
            saveSelectedContacts(selectedContacts);
            updateWhatsappLinks(index);
        }

        function updateWhatsappLinks(index) {
            const invitation = document.getElementById(\`invitation-\${index}\`);
            const originalName = invitation.querySelector('.original-group-name').textContent;
            const selectedContacts = getSelectedContacts();
            const selectedPhones = selectedContacts[originalName] || [];
            const message = invitation.querySelector('.message-textarea').value;
            const editedNames = getEditedNames();
            const currentNames = editedNames[originalName] || originalName;
            const isGroup = message.includes('{names}');
            const formattedMessage = isGroup
                ? message.replace('{names}', currentNames)
                : message.replace('{name}', currentNames);
            
            const linksContainer = invitation.querySelector('.whatsapp-links');
            linksContainer.innerHTML = selectedPhones.map(phoneNumber => \`
                <a href="https://wa.me/\${encodeURIComponent(phoneNumber)}?text=\${encodeMessageForWhatsApp(formattedMessage)}"
                   onclick="markAsOpened(this)"
                   class="whatsapp-link"
                   target="_blank">Open WhatsApp (\${formatPhoneNumber(phoneNumber)})</a>
            \`).join('');
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            const openedLinks = getOpenedLinks();
            const selectedContacts = getSelectedContacts();
            const editedNames = getEditedNames();
            const skippedInvitations = getSkippedInvitations();
            
            document.querySelectorAll('.invitation').forEach(invitation => {
                const index = parseInt(invitation.id.split('-')[1]);
                const originalName = invitation.querySelector('.original-group-name').textContent;
                
                if (openedLinks.includes(originalName)) {
                    invitation.classList.add('opened');
                }
                
                if (skippedInvitations.includes(index)) {
                    invitation.classList.add('skipped-invitation');
                }
                
                if (selectedContacts[originalName]) {
                    selectedContacts[originalName].forEach(phone => {
                        const checkbox = invitation.querySelector(\`input[value="\${phone}"]\`);
                        if (checkbox) {
                            checkbox.checked = true;
                        }
                    });
                    updateWhatsappLinks(index);
                }

                if (editedNames[originalName]) {
                    const nameInput = invitation.querySelector('.name-input');
                    nameInput.value = editedNames[originalName];
                    const messageInput = invitation.querySelector('.message-textarea');
                    updateLink(messageInput, index);
                }
            });
        });
    </script>
</head>
<body>
    <h1>WhatsApp Invitations</h1>
    <ol>
    ${matches
      .map((match, index) => {
        const message = match.isGroup ? groupMessage : individualMessage;
        const isGroup = message.includes("{names}");
        const formattedMessage = isGroup
          ? message.replace("{names}", match.name)
          : message.replace("{name}", match.name);

        return `
        <li class="invitation" id="invitation-${index}">
            <h2>Invitation ${index + 1}</h2>
            <div class="group-names">
                <input type="text" 
                       class="name-input" 
                       value="${match.name}" 
                       onchange="updateNames(this, ${index})"
                       placeholder="Edit guest names">
                <button class="skip-button" onclick="skipInvitation(${index})">Skip</button>
            </div>
            <span class="original-group-name" style="display: none">${match.name}</span>
            <div class="invitation-content">
                <div class="phone-options">
                    ${match.contacts
                      .map((contact) => {
                        const confidenceClass =
                          contact.confidence >= 0.8
                            ? "high"
                            : contact.confidence >= 0.5
                              ? "medium"
                              : "low";
                        return `
                          <div class="contact">
                            <strong>${contact.name}</strong>
                            <span class="confidence ${confidenceClass}">
                              ${Math.round(contact.confidence * 100)}% match
                            </span>
                            <div class="contact-phones">
                              ${contact.phones
                                .map(
                                  (phone) => `
                                <div class="phone-option">
                                  <input type="checkbox" 
                                         value="${phone}" 
                                         onchange="handleContactSelection(this, ${index})">
                                  <label>${phone}</label>
                                </div>
                              `
                                )
                                .join("")}
                            </div>
                          </div>
                        `;
                      })
                      .join("")}
                </div>
                <p>Message: <textarea class="message-textarea" onchange="updateLink(this, ${index})">${message}</textarea></p>
                <div class="preview">${formattedMessage}</div>
                <div class="whatsapp-links"></div>
            </div>
            <div class="skipped-content">
                <span class="skipped-flag">Skipped</span>
            </div>
        </li>
    `;
      })
      .join("")}
    </ol>
    
    <div id="skipped-section"></div>
</body>
</html>`;

    // Add script to generate skipped section
    const skippedSectionScript = `
    <script>
        function generateSkippedSection() {
            const skippedSection = document.getElementById('skipped-section');
            const skipped = ${JSON.stringify(skipped)};
            const matches = ${JSON.stringify(matches)};
            const skippedInvitations = getSkippedInvitations();
            
            if (skipped.length > 0 || skippedInvitations.length > 0) {
                const html = \`
                    <div class="skipped">
                        <h2>Skipped Names</h2>
                        <ul>
                            \${skipped
                                .filter((s) => s.reason === "Skipped by user")
                                .map((s) => \`<li>\${s.name}</li>\`)
                                .join("")}
                            \${matches
                                .filter((m, index) => skippedInvitations.includes(index))
                                .map((m) => \`<li>\${m.name}</li>\`)
                                .join("")}
                        </ul>
                        <h2>Not Found Names</h2>
                        <ul>
                            \${skipped
                                .filter((s) => s.reason === "No matches found")
                                .map((s) => \`<li>\${s.name}</li>\`)
                                .join("")}
                        </ul>
                    </div>
                \`;
                skippedSection.innerHTML = html;
            }
        }
        
        // Generate skipped section after page loads
        document.addEventListener('DOMContentLoaded', () => {
            generateSkippedSection();
        });
    </script>
    `;

    return html + skippedSectionScript;
  }
}

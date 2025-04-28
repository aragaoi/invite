import vcard from "vcard-parser";
import fs from "fs/promises";
import path from "path";
import Levenshtein from "levenshtein";

export class ContactParser {
  constructor() {
    this.contacts = [];
  }

  normalizePhone(phone) {
    if (!phone) return "";
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // Check for known country codes
    if (digits.startsWith("55")) {
      return `+${digits}`;
    }
    if (digits.startsWith("372")) {
      return `+${digits}`;
    }
    if (digits.startsWith("358")) {
      return `+${digits}`;
    }

    // If it's 10 or 11 digits (Brazilian number without country code), add +55
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }

    // If it's already in international format, just add + if missing
    if (digits.length > 11) {
      return phone.startsWith("+") ? phone : `+${digits}`;
    }

    return phone;
  }

  parseVCardContent(content) {
    try {
      const card = vcard.parse(content);
      const phones =
        card.tel?.map((tel) => this.normalizePhone(tel.value)) || [];
      return {
        name: card.fn?.[0]?.value || "",
        phones: phones.filter((phone) => phone),
        email: card.email?.[0]?.value || "",
      };
    } catch (error) {
      throw new Error(`Failed to parse vcard content: ${error.message}`);
    }
  }

  async parseVCardFile(filePath) {
    try {
      const vcardContent = await fs.readFile(filePath, "utf-8");
      const contacts = [];
      const vcards = vcardContent
        .split("BEGIN:VCARD")
        .filter((card) => card.trim());

      for (const card of vcards) {
        try {
          const vcardText = "BEGIN:VCARD" + card;
          const contact = this.parseVCardContent(vcardText);
          if (contact.name && contact.phones.length > 0) {
            contacts.push(contact);
          }
        } catch (e) {
          // Silently skip invalid contacts
        }
      }

      return contacts;
    } catch (error) {
      throw new Error(
        `Failed to parse vcard file ${filePath}: ${error.message}`
      );
    }
  }

  async loadContactsFromDirectory(directoryPath = "data/vcards") {
    try {
      const files = await fs.readdir(directoryPath);
      const vcardFiles = files.filter(
        (file) =>
          file.toLowerCase().endsWith(".vcf") &&
          !file.toLowerCase().includes("example.vcf")
      );

      const allContacts = await Promise.all(
        vcardFiles.map((file) =>
          this.parseVCardFile(path.join(directoryPath, file))
        )
      );

      // Filter out similar names
      const uniqueContacts = [];
      for (const contact of allContacts.flat()) {
        uniqueContacts.push(contact);
      }

      this.contacts = uniqueContacts;
      console.log(`Total unique contacts loaded: ${this.contacts.length}`);
      return this.contacts;
    } catch (error) {
      throw new Error(
        `Failed to load contacts from directory: ${error.message}`
      );
    }
  }

  getContacts() {
    return this.contacts;
  }
}

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContactParser };
}

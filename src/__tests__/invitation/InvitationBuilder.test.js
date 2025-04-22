import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";
import { InvitationBuilder } from "../../invitation/InvitationBuilder.js";
import { ContactParser } from "../../contacts/ContactParser.js";
import { ContactMatcher } from "../../contacts/ContactMatcher.js";

// Mock dependencies
jest.mock("inquirer");
jest.mock("fs/promises");
jest.mock("../../contacts/ContactParser.js");
jest.mock("../../contacts/ContactMatcher.js");

describe("InvitationBuilder", () => {
  let invitationBuilder;
  let mockContactMatcher;

  beforeEach(() => {
    mockContactMatcher = new ContactMatcher();
    invitationBuilder = new InvitationBuilder();
    invitationBuilder.contactMatcher = mockContactMatcher;
    jest.clearAllMocks();
  });

  describe("readNames", () => {
    it("should read and parse names from file", async () => {
      fs.readFile.mockResolvedValue("John Doe\nJane Smith\n\nBob Johnson");

      const names = await invitationBuilder.readNames();
      expect(names).toEqual(["John Doe", "Jane Smith", "Bob Johnson"]);
      expect(fs.readFile).toHaveBeenCalledWith("data/names.txt", "utf-8");
    });

    it("should handle empty file", async () => {
      fs.readFile.mockResolvedValue("");

      const names = await invitationBuilder.readNames();
      expect(names).toEqual([]);
    });
  });

  describe("readMessage", () => {
    it("should read message from file and trim content", async () => {
      fs.readFile.mockResolvedValue("  Hello {name}!  \n");

      const message = await invitationBuilder.readMessage("data/message.txt");
      expect(message).toBe("Hello {name}!");
      expect(fs.readFile).toHaveBeenCalledWith("data/message.txt", "utf-8");
    });
  });

  describe("findAndConfirmMatches", () => {
    it("should handle matches and user selections", async () => {
      const names = ["John", "Jane"];
      const mockContacts = [
        { name: "John Doe", phone: "1234567890" },
        { name: "Jane Smith", phone: "0987654321" },
      ];

      mockContactMatcher.findMatches.mockImplementation((name) => {
        if (name === "John") return [mockContacts[0]];
        if (name === "Jane") return [mockContacts[1]];
        return [];
      });

      const result = await invitationBuilder.findAndConfirmMatches(names);
      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].name).toBe("John");
      expect(result.matches[0].contacts[0].name).toBe("John Doe");
      expect(result.matches[1].name).toBe("Jane");
      expect(result.matches[1].contacts[0].name).toBe("Jane Smith");
      expect(result.skipped).toHaveLength(0);
    });

    it("should handle no matches found", async () => {
      const names = ["Bob"];
      mockContactMatcher.findMatches.mockReturnValue([]);

      const result = await invitationBuilder.findAndConfirmMatches(names);
      expect(result.matches).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].name).toBe("Bob");
      expect(result.skipped[0].reason).toBe("No matches found");
    });
  });

  describe("start", () => {
    beforeEach(() => {
      // Mock successful file operations
      fs.readFile.mockImplementation((path) => {
        if (path === "data/names.txt")
          return Promise.resolve("John Doe\nJane Smith");
        if (path === "data/individual_message.txt")
          return Promise.resolve("Hello {name}!");
        if (path === "data/group_message.txt")
          return Promise.resolve("Hello {names}!");
        return Promise.reject(new Error("File not found"));
      });

      // Mock ContactParser
      ContactParser.prototype.loadContactsFromDirectory.mockResolvedValue([
        { name: "John Doe", phones: ["1234567890"] },
      ]);

      // Mock ContactMatcher
      ContactMatcher.prototype.findMatches.mockReturnValue([
        {
          name: "John Doe",
          phones: ["1234567890"],
          confidence: 1,
        },
      ]);

      // Mock inquirer
      inquirer.prompt.mockResolvedValue({
        selectedContact: {
          name: "John Doe",
          phones: ["1234567890"],
          phone: "1234567890",
          originalName: "John Doe",
          confidence: 1,
        },
      });

      // Mock file system operations
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);

      // Mock path.resolve
      jest.spyOn(path, "resolve").mockReturnValue("/path/to/dist/index.html");
    });

    it("should complete the full invitation building process", async () => {
      const htmlPath = await invitationBuilder.start();

      expect(fs.mkdir).toHaveBeenCalledWith("dist", { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        "dist/index.html",
        expect.any(String)
      );
      expect(htmlPath).toBe("/path/to/dist/index.html");
    });

    it("should handle errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      fs.readFile.mockRejectedValue(new Error("File read error"));

      await expect(invitationBuilder.start()).rejects.toThrow(
        "File read error"
      );

      expect(consoleSpy).toHaveBeenCalledWith("Error:", "File read error");
      consoleSpy.mockRestore();
    });
  });

  describe("generateHtml", () => {
    it("should generate HTML with matches and skipped contacts", () => {
      const matches = [
        {
          name: "John",
          contacts: [{ name: "John Doe", phone: "1234567890" }],
          isGroup: false,
        },
      ];
      const skipped = [
        { name: "Jane", reason: "Skipped by user" },
        { name: "Bob", reason: "No matches found" },
      ];
      const individualMessage = "Hello {name}!";
      const groupMessage = "Hello {names}!";

      const html = invitationBuilder.generateHtml(
        matches,
        skipped,
        individualMessage,
        groupMessage
      );

      expect(html).toContain("Hello John Doe!");
      expect(html).toContain("Skipped Names");
      expect(html).toContain("Not Found Names");
      expect(html).toContain("Jane");
      expect(html).toContain("Bob");
    });

    it("should handle empty matches and skipped lists", () => {
      const html = invitationBuilder.generateHtml(
        [],
        [],
        "Hello {name}!",
        "Hello {names}!"
      );

      expect(html).toContain("WhatsApp Invitations");
      expect(html).not.toContain("Skipped Names");
      expect(html).not.toContain("Not Found Names");
    });
  });
});

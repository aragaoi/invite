import fs from "fs/promises";
import path from "path";
import { InvitationBuilder } from "../../invitation/InvitationBuilder.js";
import { ContactParser } from "../../contacts/ContactParser.js";
import { ContactMatcher } from "../../contacts/ContactMatcher.js";

// Mock dependencies
jest.mock("fs/promises");
jest.mock("../../contacts/ContactParser.js");
jest.mock("../../contacts/ContactMatcher.js");

describe("InvitationBuilder", () => {
  let invitationBuilder;

  beforeEach(() => {
    invitationBuilder = new InvitationBuilder();
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
    it("should handle matches with default separators", async () => {
      const names = ["John e Mary", "Jane, Bob"];
      const mockContacts = [
        { name: "John", phones: ["1234567890"], confidence: 0.9 },
        { name: "Mary", phones: ["0987654321"], confidence: 0.9 },
        { name: "Jane", phones: ["1122334455"], confidence: 0.9 },
        { name: "Bob", phones: ["5566778899"], confidence: 0.9 },
      ];

      const mockContactMatcher = {
        findMatches: jest.fn().mockImplementation((name) => {
          const contact = mockContacts.find((c) => c.name === name);
          return Promise.resolve(contact ? [contact] : []);
        }),
      };

      const result = await invitationBuilder.findAndConfirmMatches(
        names,
        mockContactMatcher
      );
      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].isGroup).toBe(true);
      expect(result.matches[0].contacts).toHaveLength(2);
      expect(result.matches[1].isGroup).toBe(true);
      expect(result.matches[1].contacts).toHaveLength(2);
    });

    it("should handle matches with custom separators", async () => {
      process.env.GROUP_SEPARATORS = " and | with ";
      const names = ["John and Mary", "Jane with Bob"];
      const mockContacts = [
        { name: "John", phones: ["1234567890"], confidence: 0.9 },
        { name: "Mary", phones: ["0987654321"], confidence: 0.9 },
        { name: "Jane", phones: ["1122334455"], confidence: 0.9 },
        { name: "Bob", phones: ["5566778899"], confidence: 0.9 },
      ];

      const mockContactMatcher = {
        findMatches: jest.fn().mockImplementation((name) => {
          const contact = mockContacts.find((c) => c.name === name);
          return Promise.resolve(contact ? [contact] : []);
        }),
      };

      const result = await invitationBuilder.findAndConfirmMatches(
        names,
        mockContactMatcher
      );
      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].isGroup).toBe(true);
      expect(result.matches[0].contacts).toHaveLength(2);
      expect(result.matches[1].isGroup).toBe(true);
      expect(result.matches[1].contacts).toHaveLength(2);
      delete process.env.GROUP_SEPARATORS;
    });

    it("should handle no matches found", async () => {
      const names = ["Bob"];
      const mockContactMatcher = {
        findMatches: jest.fn().mockResolvedValue([]),
      };

      const result = await invitationBuilder.findAndConfirmMatches(
        names,
        mockContactMatcher
      );
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
      ContactMatcher.mockImplementation(() => ({
        findMatches: jest.fn().mockResolvedValue([
          {
            name: "John Doe",
            phones: ["1234567890"],
            confidence: 1,
          },
        ]),
      }));

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
          contacts: [
            {
              name: "John Doe",
              phones: ["1234567890"],
              confidence: 0.9,
            },
          ],
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

      expect(html).toContain("John Doe");
      expect(html).toContain("90% match");
      expect(html).toContain("1234567890");
      expect(html).toContain("Hello {name}!");
      expect(html).toContain("Jane");
      expect(html).toContain("Bob");
      expect(html).toContain("https://wa.me/");
    });

    it("should generate HTML with formatted phone numbers", () => {
      const matches = [
        {
          name: "John",
          contacts: [
            {
              name: "John Doe",
              phones: ["551234567890"],
              confidence: 0.9,
            },
          ],
          isGroup: false,
        },
      ];

      const html = invitationBuilder.generateHtml(
        matches,
        [],
        "Hello {name}!",
        "Hello {names}!"
      );

      expect(html).toContain("551234567890");
    });

    it("should handle empty matches and skipped lists", () => {
      const html = invitationBuilder.generateHtml(
        [],
        [],
        "Hello {name}!",
        "Hello {names}!"
      );

      expect(html).toContain("WhatsApp Invitations");
    });
  });
});

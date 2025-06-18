import { ContactParser } from "../../contacts/ContactParser.js";
import fs from "fs/promises";
import path from "path";

jest.mock("fs/promises");

describe("ContactParser", () => {
  let contactParser;

  beforeEach(() => {
    contactParser = new ContactParser();
    jest.clearAllMocks();
  });

  describe("parseVCardContent", () => {
    it("should parse a valid vCard with name and phone", () => {
      const vcardContent = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
TEL:1234567890
END:VCARD`;

      const result = contactParser.parseVCardContent(vcardContent);
      expect(result).toEqual({
        name: "John Doe",
        phones: ["+551234567890"],
        email: "",
      });
    });

    it("should handle vCard with multiple phones", () => {
      const vcardContent = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
TEL:1234567890
TEL:0987654321
END:VCARD`;

      const result = contactParser.parseVCardContent(vcardContent);
      expect(result).toEqual({
        name: "John Doe",
        phones: ["+551234567890", "+550987654321"],
        email: "",
      });
    });

    it("should parse international numbers with known country codes", () => {
      const vcardContent = `BEGIN:VCARD
VERSION:3.0
FN:Jane Doe
TEL:3721234567
TEL:+358401234567
END:VCARD`;

      const result = contactParser.parseVCardContent(vcardContent);
      expect(result).toEqual({
        name: "Jane Doe",
        phones: ["+3721234567", "+358401234567"],
        email: "",
      });
    });
  });

  describe("loadContactsFromDirectory", () => {
    it("should load and parse contacts from directory", async () => {
      const mockFiles = ["contact1.vcf", "contact2.vcf"];
      const mockVcardContent = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
TEL:1234567890
END:VCARD`;

      fs.readdir.mockResolvedValue(mockFiles);
      fs.readFile.mockResolvedValue(mockVcardContent);

      const result = await contactParser.loadContactsFromDirectory();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: "John Doe",
        phones: ["+551234567890"],
        email: "",
      });
    });

    it("should handle empty directory", async () => {
      fs.readdir.mockResolvedValue([]);

      const result = await contactParser.loadContactsFromDirectory();
      expect(result).toHaveLength(0);
    });

    it("should handle invalid vCard files", async () => {
      const mockFiles = ["contact1.vcf"];
      const mockVcardContent = "invalid content";

      fs.readdir.mockResolvedValue(mockFiles);
      fs.readFile.mockResolvedValue(mockVcardContent);

      const result = await contactParser.loadContactsFromDirectory();
      expect(result).toHaveLength(0);
    });
  });
});

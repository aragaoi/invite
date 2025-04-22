import { MessageBuilder } from "../../messages/MessageBuilder.js";

describe("MessageBuilder", () => {
  let messageBuilder;

  beforeEach(() => {
    messageBuilder = new MessageBuilder();
  });

  describe("createIndividualMessage", () => {
    it("should create a WhatsApp URL with name and message", () => {
      const name = "John Doe";
      const phone = "1234567890";
      const message = "Hello {name}!";
      const result = messageBuilder.createIndividualMessage(
        name,
        phone,
        message
      );
      expect(result).toBe("https://wa.me/1234567890?text=Hello%20John%20Doe!");
    });
  });

  describe("createGroupMessage", () => {
    it("should create individual WhatsApp URLs with the original group name", () => {
      const names = ["John", "Mary"];
      const originalNames = "John e Mary";
      const phones = ["1234567890", "0987654321"];
      const message = "Hello {names}!";
      const result = messageBuilder.createGroupMessage(
        names,
        originalNames,
        phones,
        message
      );
      expect(result).toEqual([
        "https://wa.me/1234567890?text=Hello%20John%20e%20Mary!",
        "https://wa.me/0987654321?text=Hello%20John%20e%20Mary!",
      ]);
    });

    it("should handle group names with commas", () => {
      const names = ["John", "Mary", "Peter"];
      const originalNames = "John, Mary, Peter";
      const phones = ["1234567890", "0987654321", "1122334455"];
      const message = "Hello {names}!";
      const result = messageBuilder.createGroupMessage(
        names,
        originalNames,
        phones,
        message
      );
      expect(result).toEqual([
        "https://wa.me/1234567890?text=Hello%20John%2C%20Mary%2C%20Peter!",
        "https://wa.me/0987654321?text=Hello%20John%2C%20Mary%2C%20Peter!",
        "https://wa.me/1122334455?text=Hello%20John%2C%20Mary%2C%20Peter!",
      ]);
    });
  });

  describe("determineMessageType", () => {
    it("should return individual for single name", () => {
      const result = messageBuilder.determineMessageType(["John Doe"]);
      expect(result).toBe("individual");
    });

    it("should return group for multiple names", () => {
      const result = messageBuilder.determineMessageType([
        "John Doe",
        "Jane Smith",
      ]);
      expect(result).toBe("group");
    });
  });
});

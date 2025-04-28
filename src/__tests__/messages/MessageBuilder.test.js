import { MessageBuilder } from "../../messages/MessageBuilder.js";

describe("MessageBuilder", () => {
  let messageBuilder;

  beforeEach(() => {
    messageBuilder = new MessageBuilder();
  });

  describe("createIndividualMessage", () => {
    it("should create individual message with name replacement", () => {
      const name = "John";
      const phone = "1234567890";
      const message = "Hello {name}!";

      const result = messageBuilder.createIndividualMessage(
        name,
        phone,
        message
      );
      expect(result).toBe("https://wa.me/1234567890?text=Hello%20John!");
    });

    it("should handle special characters in name", () => {
      const name = "João";
      const phone = "1234567890";
      const message = "Hello {name}!";

      const result = messageBuilder.createIndividualMessage(
        name,
        phone,
        message
      );
      expect(result).toBe("https://wa.me/1234567890?text=Hello%20Jo%C3%A3o!");
    });
  });

  describe("createGroupMessage", () => {
    it("should create group message with names replacement", () => {
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
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(
        "https://wa.me/1234567890?text=Hello%20John%20e%20Mary!"
      );
      expect(result[1]).toBe(
        "https://wa.me/0987654321?text=Hello%20John%20e%20Mary!"
      );
    });

    it("should handle special characters in names", () => {
      const names = ["João", "Maria"];
      const originalNames = "João e Maria";
      const phones = ["1234567890", "0987654321"];
      const message = "Hello {names}!";

      const result = messageBuilder.createGroupMessage(
        names,
        originalNames,
        phones,
        message
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(
        "https://wa.me/1234567890?text=Hello%20Jo%C3%A3o%20e%20Maria!"
      );
      expect(result[1]).toBe(
        "https://wa.me/0987654321?text=Hello%20Jo%C3%A3o%20e%20Maria!"
      );
    });
  });

  describe("determineMessageType", () => {
    it("should determine individual message type", () => {
      const names = ["John"];
      const result = messageBuilder.determineMessageType(names);
      expect(result).toBe("individual");
    });

    it("should determine group message type", () => {
      const names = ["John", "Mary"];
      const result = messageBuilder.determineMessageType(names);
      expect(result).toBe("group");
    });
  });
});

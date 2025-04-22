import { ContactMatcher } from "../../contacts/ContactMatcher.js";

describe("ContactMatcher", () => {
  let contactMatcher;
  const contacts = [
    { name: "João Silva", phone: "1234567890" },
    { name: "Maria Santos", phone: "0987654321" },
    { name: "José Oliveira", phone: "1122334455" },
    { name: "Ana Costa", phone: "5566778899" },
    { name: "Pedro Alves", phone: "9988776655" },
    { name: "Carla Lima", phone: "4433221100" },
  ];

  beforeEach(() => {
    contactMatcher = new ContactMatcher(contacts);
  });

  describe("findMatches", () => {
    it("should find exact matches with high confidence", () => {
      const matches = contactMatcher.findMatches("João Silva");
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe("João Silva");
      expect(matches[0].confidence).toBe(1);
    });

    it("should find substring matches with 0.9 confidence", () => {
      const matches = contactMatcher.findMatches("Silva");
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe("João Silva");
      expect(matches[0].confidence).toBe(0.9);
    });

    it("should find similar matches with lower confidence", () => {
      const matches = contactMatcher.findMatches("Silvo");
      expect(matches.length).toBeLessThanOrEqual(5);
      expect(matches[0].name).toBe("João Silva");
      expect(matches[0].confidence).toBeLessThan(0.9);
      expect(matches[0].confidence).toBeGreaterThan(0.2);
      expect(matches).toBeSortedByConfidence();
    });

    it("should handle accented characters", () => {
      const matches = contactMatcher.findMatches("Joao Silva");
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe("João Silva");
      expect(matches[0].confidence).toBeGreaterThan(0.8);
    });

    it("should return up to 5 matches for low similarity matches", () => {
      const matches = contactMatcher.findMatches("a");
      expect(matches.length).toBeLessThanOrEqual(5);
      expect(matches.every((m) => m.confidence > 0)).toBe(true);
    });

    it("should sort matches by confidence", () => {
      const matches = contactMatcher.findMatches("a");
      expect(matches).toBeSortedByConfidence();
    });

    it("should return empty array for very low similarity matches", () => {
      const matches = contactMatcher.findMatches("xyz");
      expect(matches).toHaveLength(0);
    });
  });

  describe("normalizeName", () => {
    it("should convert to lowercase and trim", () => {
      expect(contactMatcher.normalizeName("  John DOE  ")).toBe("john doe");
    });
  });

  describe("calculateConfidence", () => {
    it("should return 1 for exact matches", () => {
      expect(contactMatcher.calculateConfidence("john", "john")).toBe(1);
    });

    it("should return 0.9 for substring matches", () => {
      expect(contactMatcher.calculateConfidence("john", "john doe")).toBe(0.9);
    });

    it("should return lower confidence for similar names", () => {
      const confidence = contactMatcher.calculateConfidence("john", "jon");
      expect(confidence).toBeLessThan(0.9);
      expect(confidence).toBeGreaterThan(0);
    });
  });
});

// Custom matcher
expect.extend({
  toBeSortedByConfidence(matches) {
    for (let i = 1; i < matches.length; i++) {
      if (matches[i - 1].confidence < matches[i].confidence) {
        return {
          message: () =>
            `expected matches to be sorted by confidence in descending order`,
          pass: false,
        };
      }
    }
    return {
      message: () => `expected matches not to be sorted by confidence`,
      pass: true,
    };
  },
});

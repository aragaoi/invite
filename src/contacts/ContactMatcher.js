import Levenshtein from "levenshtein";

export class ContactMatcher {
  constructor(contacts) {
    this.contacts = contacts;
    this.similarityThreshold = 0.2; // 50% similarity threshold
  }

  findMatches(name) {
    const normalizedName = this.normalizeName(name);

    const matches = this.contacts
      .filter((contact) => {
        const normalizedContactName = this.normalizeName(contact.name);
        return this.isSimilarName(normalizedName, normalizedContactName);
      })
      .map((contact) => ({
        name: contact.name,
        phones: contact.phones,
        confidence: this.calculateConfidence(
          normalizedName,
          this.normalizeName(contact.name)
        ),
      }))
      .sort((a, b) => b.confidence - a.confidence);
    return matches.some((match) => match.confidence >= 0.5)
      ? matches.slice(0, 3)
      : matches.slice(0, 5);
  }

  normalizeName(name) {
    return name.toLowerCase().trim();
  }

  isSimilarName(name1, name2) {
    if (!name1 || !name2) return false;
    return (
      name2.includes(name1) ||
      name1.includes(name2) ||
      this.calculateLevenshteinSimilarity(name1, name2) >=
        this.similarityThreshold
    );
  }

  calculateConfidence(name1, name2) {
    if (name1 === name2) return 1;
    if (name2.includes(name1) || name1.includes(name2)) return 0.9;
    return this.calculateLevenshteinSimilarity(name1, name2);
  }

  calculateLevenshteinSimilarity(name1, name2) {
    const distance = new Levenshtein(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    return 1 - distance.distance / maxLength;
  }
}

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContactMatcher };
}

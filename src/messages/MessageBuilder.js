export class MessageBuilder {
  constructor() {
    this.baseUrl = "https://wa.me/";
  }

  createIndividualMessage(name, phone, message) {
    const formattedMessage = message.replace("{name}", name);
    const encodedMessage = encodeURIComponent(formattedMessage);
    return `${this.baseUrl}${phone}?text=${encodedMessage}`;
  }

  createGroupMessage(names, originalNames, phones, message) {
    return phones.map((phone) => {
      const individualMessage = message.replace("{names}", originalNames);
      return this.createIndividualMessage(names[0], phone, individualMessage);
    });
  }

  determineMessageType(names) {
    return names.length === 1 ? "individual" : "group";
  }
} 
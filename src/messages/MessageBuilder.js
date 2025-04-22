export class MessageBuilder {
  constructor() {
    this.baseUrl = 'https://wa.me/';
  }

  createIndividualMessage(name, phone, message) {
    const encodedMessage = encodeURIComponent(message);
    return `${this.baseUrl}${phone}?text=${encodedMessage}`;
  }

  createGroupMessage(names, phones, message) {
    const encodedMessage = encodeURIComponent(message);
    const phoneList = phones.join(',');
    return `${this.baseUrl}${phoneList}?text=${encodedMessage}`;
  }

  determineMessageType(names) {
    return names.length === 1 ? 'individual' : 'group';
  }
} 
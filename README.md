# WhatsApp Invitation Builder

A tool to create WhatsApp invitation links by matching names with contacts from vcard files.

## Features

- Parse contacts from multiple vcard files
- Match names with contacts using fuzzy matching (Levenshtein distance)
- [Create individual or group WhatsApp links](#message-placeholders)
- Interactive confirmation of matches with confidence scores
- Generate HTML file with clickable links
- Track opened links
- Edit messages and phone numbers before sending
- [Message placeholders for names](#message-placeholders)
- Support for multiple phone numbers per contact
- Automatic browser opening of generated HTML

## Installation

```bash
npm install
```

## Usage

1. Prepare your files:

   - `data/names.txt`: List of names (one per line, comma-separated for groups)
   - `data/individual_message.txt`: Message for individual invites (use {name} placeholder)
   - `data/group_message.txt`: Message for group invites (use {names} placeholder)
   - `data/vcards/`: Directory containing your vcard files (*.vcf)

2. Run the tool:

```bash
npm start
```

The tool will:

1. Load all vcard files from the vcards directory
2. Read names and messages from the input files
3. Find probable matches for each name using fuzzy matching
4. Show confidence scores for each match
5. Let you confirm the matches and select phone numbers for contacts with multiple numbers
6. Generate an HTML file with:
   - Numbered list of invitations
   - Editable messages with placeholders
   - Editable phone numbers
   - Message preview showing the formatted text
   - Clickable links that update when messages or numbers are edited
   - Visual feedback for opened links
   - List of skipped and not found names

## Example Files

Example files are provided in the `data` directory:

- `data/names_example.txt`: Example list of names
- `data/individual_message_example.txt`: Example message for individual invites
- `data/group_message_example.txt`: Example message for group invites
- `data/vcards/example.vcf`: Example vCard file with sample contacts

To use the example files, rename them by removing the "_example" suffix:

```bash
cd data
mv names_example.txt names.txt
mv individual_message_example.txt individual_message.txt
mv group_message_example.txt group_message.txt
```

## Message Placeholders

- Use `{name}` in individual message to insert the recipient's name
- Use `{names}` in group message to insert the list of recipients' names

Example messages:

- Individual: "Hello {name}! You're invited to our event"
- Group: "Hello {names}! You're all invited to our event"

### Generated Links

The tool generates WhatsApp links in the following format:

- Individual: `https://wa.me/PHONE_NUMBER?text=Hello%20John!%20You're%20invited%20to%20our%20event`

The links are automatically URL-encoded and include:
- Phone numbers in international format (without + or spaces)
- The formatted message with placeholders replaced

Note: WhatsApp links only support individual messages. For multiple recipients, separate links will be generated.

### Group Messages

When a line in `names.txt` contains multiple names (separated by " e "), the group message will be used. For example:

- If `names.txt` contains: `"John e Mary"`
- The group message will be used, replacing `{names}` with "John, Mary"
- The resulting message will be: "Hello John, Mary! You're all invited to our event"

## Requirements

- Node.js 14+
- Vcard files (*.vcf) in the data/vcards directory
- WhatsApp Web or Desktop installed

## Development

### Project Structure

- `src/index.js`: Main application entry point
- `src/invitation/`: Invitation-related functionality
  - `InvitationBuilder.js`: Handles invitation generation and HTML output
- `src/contacts/`: Contact-related functionality
  - `ContactParser.js`: Parses vCard files
  - `ContactMatcher.js`: Matches names with contacts using fuzzy matching
- `src/messages/`: Message-related functionality
  - `MessageBuilder.js`: Handles message formatting and placeholders

### Testing

Run the tests:

```bash
npm test
```

The test suite covers:
- Contact parsing and matching
- Message building and formatting
- Invitation generation
- Error handling

Test files are organized to mirror the source code structure:
```
src/
  ├── __tests__/
  │   ├── invitation/
  │   │   └── InvitationBuilder.test.js
  │   ├── messages/
  │   │   └── MessageBuilder.test.js
  │   └── contacts/
  │       ├── ContactParser.test.js
  │       └── ContactMatcher.test.js
```

## Tools

- [inquirer](https://github.com/SBoudrias/Inquirer.js) - Interactive command line interface
- [levenshtein](https://github.com/gf3/Levenshtein) - String similarity measurement
- [vcard-parser](https://github.com/taoyuan/vcard-parser) - vCard file parsing
- [open](https://github.com/sindresorhus/open) - Open files and URLs in the default application
- [jest](https://jestjs.io/) - Testing framework

## License

MIT

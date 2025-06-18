# WhatsApp Invitation Builder

A tool to create WhatsApp invitation links by matching names with contacts from vcard files.

## Features

- Parse contacts from multiple vcard files
- Match names with contacts using fuzzy matching (Levenshtein distance)
- [Create individual or group WhatsApp links](#message-placeholders)
- Generate HTML file with clickable links
- Track opened links
- Edit messages and phone numbers before sending
- [Message placeholders for names](#message-placeholders)
- Support for multiple phone numbers per contact
- Automatic browser opening of generated HTML
- Skip functionality for invitations
- Persistent storage of selections and skipped invitations
- Grouped display of contacts and their phone numbers
- Confidence score visualization
- Editable guest names

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
4. Generate an HTML file with:
   - Numbered list of invitations
   - Editable messages with placeholders
   - Editable guest names
   - Message preview showing the formatted text
   - Clickable links that update when messages or names are edited
   - Visual feedback for opened links
   - Skip button for each invitation
   - List of skipped and not found names
   - Confidence score indicators for each match
   - Grouped display of contacts and their phone numbers
5. Automatically open the generated HTML in your default browser

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
- Phone numbers in international format
- The formatted message with placeholders replaced

### Phone Number Formats

Numbers may include an international prefix. The parser currently understands Brazilian (55), Estonian (372) and Finnish (358) codes. Ten or eleven digit numbers without a code are assumed to be Brazilian and automatically prefixed with +55.

### Group Messages

When a line in `names.txt` contains multiple names (separated by the characters specified in `GROUP_SEPARATORS` environment variable, defaulting to `,` and ` e `), the group message will be used. For example:

- If `names.txt` contains: `"John e Mary"` or `"John, Mary"`
- The group message will be used, replacing `{names}` with "John, Mary"
- The resulting message will be: "Hello John, Mary! You're all invited to our event"

You can customize the separators by setting the `GROUP_SEPARATORS` environment variable to a pipe-separated list of separator strings. For example:
```bash
export GROUP_SEPARATORS=",| e | and "
```

### Skip Functionality

- Each invitation has a skip button
- Clicking the skip button toggles the invitation's skipped state
- Skipped invitations are stored in localStorage
- Skipped invitations are shown in a collapsed format
- A list of all skipped invitations is shown at the bottom of the page

### Persistent Storage

The tool uses localStorage to persist:
- Selected phone numbers for each invitation
- Skipped invitations
- Edited guest names
- Opened links

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

### Formatting

Format code using Prettier:

```bash
npm run format
```


## Tools

- [levenshtein](https://github.com/gf3/Levenshtein) - String similarity measurement
- [vcard-parser](https://github.com/taoyuan/vcard-parser) - vCard file parsing
- [open](https://github.com/sindresorhus/open) - Open files and URLs in the default application
- [jest](https://jestjs.io/) - Testing framework

## License

MIT

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Support for customizable group name separators via `GROUP_SEPARATORS` environment variable
- Phone number formatting with proper spacing
- Skip functionality for invitations
- Confidence score visualization for contact matches
- Persistent storage of selections and edits
- Support for multiple phone numbers per contact
- Editable guest names in the interface

### Changed
- Updated WhatsApp link format to use `wa.me` instead of `api.whatsapp.com`
- Improved group name detection with multiple separator support
- Enhanced HTML generation with better styling and organization
- Updated README with current features and usage instructions

### Fixed
- Message name replacement for single invites
- Phone number formatting function scope
- WhatsApp link generation with proper encoding
- Group name splitting with proper regex escaping

## [1.0.0] - 2024-03-21

### Added
- Basic contact matching functionality
- Support for individual and group invitations
- HTML generation with clickable links
- Message template support with placeholders
- Contact parsing from vCard files
- Fuzzy matching for contact names 
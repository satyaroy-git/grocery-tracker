# Privacy Policy for PantryPal: Smart Grocery Tracker

**Last Updated:** July 2026

## Introduction

PantryPal ("we", "our", "the app") is a grocery and pantry management application. This privacy policy explains how we collect, use, and protect your personal information.

## Information We Collect

### Account Information (Optional)
When you create an account for household sharing:
- **Email address** — used for authentication and account recovery
- **Display name** — shown to household members

### Pantry Data (Stored Locally)
- Item names, quantities, categories, units, prices, and expiry dates
- Consumption/usage logs
- Shopping lists and recurring item schedules

### Cloud-Synced Data (Only if you join a household)
- Pantry items and quantities (shared with household members)
- Household membership information

### Data Processed by Third-Party AI (Google Gemini API)
When you use AI features (invoice scanning, recipe suggestions, voice commands, shelf scanning):
- Invoice images are sent to Google's Gemini API for text extraction
- Pantry item names are sent to generate recipe suggestions
- Photos of shelves are sent for item recognition
- Voice/text commands are sent for intent parsing

**Important:** We do not store your images or AI interaction data on our servers. Data is sent directly from your device to Google's API.

## How We Use Your Information

- **Authentication:** Email is used solely for account login
- **Household sharing:** To sync pantry data between family members
- **AI features:** To provide recipe suggestions, parse invoices, recognize items
- **Notifications:** To alert you about expiring items and low stock (locally on device)

## Data Storage and Security

- **Local data:** Stored on your device using SQLite. Never leaves your device unless you enable household sharing.
- **Cloud data:** Stored on Supabase (AWS) with row-level security policies.
- **Auth tokens:** Stored using device-level encrypted storage (expo-secure-store).

## Data Sharing

We do **NOT**:
- Sell your personal data to third parties
- Share your data with advertisers
- Use your data for targeted advertising

We share data with:
- **Google Gemini API** — only when you actively use AI features
- **Supabase** — only if you opt into household sharing

## Your Rights

### Delete Your Data
- **Local data:** Settings > Danger Zone > "Reset All Data"
- **Account deletion:** Settings > Cloud & Household > "Delete Account"
- **Household data:** Leaving a household removes your membership

### Opt Out
- AI features require a Gemini API key you provide — don't add it and AI won't function
- Household sharing is entirely optional
- Notifications can be disabled in Settings

## Children's Privacy

PantryPal is not directed at children under 13. We do not knowingly collect personal information from children.

## Contact Us

For questions or data deletion requests:
**Email:** satya.bit123@gmail.com

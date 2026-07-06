# PantryPal - Smart Grocery Tracker

A React Native (Expo) app that helps you track your pantry inventory, manage shopping lists, and **automatically parse grocery invoices** from Indian delivery platforms using AI.

## Features

- **Pantry Management**: Track items with quantities, categories, and low-stock alerts
- **AI Invoice Parsing**: Scan/photograph invoices from Blinkit, Swiggy Instamart, BigBasket, Zepto, JioMart, Amazon Fresh, DMart Ready
- **Shopping Lists**: Generate shopping lists from low-stock items
- **Consumption Tracking**: Manual or auto-consumption modes
- **Insights**: Track weekly consumption patterns

## Invoice Parsing (AI-Powered)

The app uses **OpenAI GPT-4o Vision** to parse grocery invoices:

### Supported Input Methods:
1. **Camera**: Take a photo of a physical invoice/bill
2. **Gallery**: Select a screenshot of your order from any delivery app
3. **Text Paste**: Copy-paste order details text from any app

### Supported Platforms:
- Blinkit
- Swiggy Instamart
- BigBasket
- Zepto
- JioMart
- Amazon Fresh
- DMart Ready
- Any other grocery invoice with item names and quantities

### How It Works:
1. Open the app → Pantry tab → Tap the scan (blue) button
2. Choose "Scan Image" or "Paste Text"
3. Provide your invoice (photo/screenshot/text)
4. AI extracts all items with name, quantity, unit, and category
5. Review the extracted items, select/deselect as needed
6. Tap "Add to Pantry" to bulk-add items

### API Key Setup:
You need an OpenAI API key (with GPT-4o access):
1. Go to https://platform.openai.com/api-keys
2. Create a new key
3. In the app, the first time you use "Scan Invoice", it will prompt you for the key
4. The key is stored securely on your device

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your Android device (for testing)

### Installation

```bash
# Clone the repo
git clone https://github.com/satyaroy-git/grocery-tracker.git
cd grocery-tracker

# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

### Testing on Android Device

```bash
# Pull latest changes
cd grocery-tracker
git pull origin feature/invoice-parsing

# Install dependencies  
npm install

# Start Expo
npx expo start
```

Then scan the QR code with Expo Go app on your Android device.

## Tech Stack

- **React Native** with Expo SDK 51
- **TypeScript**
- **expo-sqlite** for local database
- **expo-image-picker** for camera/gallery access
- **OpenAI GPT-4o** for invoice vision parsing
- **React Navigation** for navigation

## Project Structure

```
src/
├── constants/
│   ├── theme.ts          # Colors, spacing, typography
│   └── categories.ts     # Categories, units, templates
├── database/
│   └── index.ts          # SQLite database operations
├── navigation/
│   ├── types.ts          # Navigation type definitions
│   ├── RootNavigator.tsx # Bottom tab navigator
│   ├── InventoryStack.tsx
│   ├── ShoppingStack.tsx
│   ├── DashboardStack.tsx
│   └── SettingsStack.tsx
├── screens/
│   ├── InventoryListScreen.tsx
│   ├── ScanInvoiceScreen.tsx  # AI invoice parsing UI
│   ├── AddItemScreen.tsx
│   ├── EditItemScreen.tsx
│   ├── ItemDetailScreen.tsx
│   ├── LogUsageScreen.tsx
│   ├── RestockScreen.tsx
│   ├── ShoppingListScreen.tsx
│   ├── AddShoppingItemScreen.tsx
│   ├── PurchaseConfirmScreen.tsx
│   ├── InsightsScreen.tsx
│   ├── SettingsScreen.tsx
│   └── OnboardingScreen.tsx
└── services/
    ├── config.ts            # API key management
    └── invoiceParser.ts     # LLM invoice parsing logic
```

## License

MIT

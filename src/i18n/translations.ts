export type Language = 'en' | 'hi';

export interface Translations {
  // Common
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
  loading: string;
  error: string;
  success: string;
  ok: string;
  confirm: string;
  skip: string;

  // Tab labels
  tabPantry: string;
  tabShopping: string;
  tabInsights: string;
  tabSettings: string;

  // Pantry screen
  pantryTitle: string;
  pantryEmpty: string;
  pantryEmptySubtitle: string;
  pantryDeleteAll: string;
  pantryDeleteAllConfirm: string;
  pantryAlreadyEmpty: string;
  pantryLowStock: string;
  pantryExpired: string;
  pantryExpiringSoon: string;

  // Sort & Filter
  sortBy: string;
  sortName: string;
  sortCategory: string;
  sortStockLevel: string;
  sortExpiry: string;
  filterAll: string;
  filterLowStock: string;
  filterExpiringSoon: string;
  filterExpired: string;

  // Item Detail
  itemDetail: string;
  currentStock: string;
  threshold: string;
  purchaseDetails: string;
  price: string;
  expiry: string;
  consumptionMode: string;
  manual: string;
  auto: string;
  recentActivity: string;
  noActivity: string;
  logUsage: string;
  restock: string;
  editItem: string;
  deleteItem: string;

  // Add/Edit Item
  addItem: string;
  itemName: string;
  category: string;
  unit: string;
  currentQuantity: string;
  lowStockThreshold: string;
  priceOptional: string;
  expiryOptional: string;
  saveItem: string;
  saveChanges: string;

  // Shopping List
  shoppingList: string;
  shoppingEmpty: string;
  shoppingEmptySubtitle: string;
  autoGenerate: string;
  share: string;
  clearDone: string;
  recurring: string;
  addToList: string;
  confirmPurchase: string;
  quantityNeeded: string;

  // Recurring Items
  recurringItems: string;
  recurringEmpty: string;
  recurringEmptySubtitle: string;
  addRecurring: string;
  frequency: string;
  daily: string;
  weekly: string;
  biweekly: string;
  monthly: string;
  nextDue: string;

  // Insights
  insightsTitle: string;
  totalItems: string;
  expiringSoon: string;
  expenditure: string;
  thisMonth: string;
  lastMonth: string;
  allTime: string;
  lastSixMonths: string;
  byCategory: string;
  weeklyConsumption: string;
  topConsumed: string;
  fastMoving: string;
  noData: string;
  daysLeft: string;

  // Settings
  settingsTitle: string;
  appearance: string;
  light: string;
  dark: string;
  system: string;
  notifications: string;
  enableNotifications: string;
  notificationsDescription: string;
  language: string;
  selectLanguage: string;
  alertFrequency: string;
  consumptionModeDefault: string;
  cloudHousehold: string;
  signIn: string;
  signOut: string;
  signUp: string;
  signedInAs: string;
  manageHousehold: string;
  cloudDescription: string;
  about: string;
  version: string;
  replayGuide: string;
  dangerZone: string;
  resetAllData: string;
  resetWarning: string;

  // Household
  household: string;
  createHousehold: string;
  joinHousehold: string;
  joinWithCode: string;
  inviteCode: string;
  shareCode: string;
  members: string;
  leaveHousehold: string;
  noHousehold: string;
  noHouseholdSubtitle: string;
  householdName: string;
  owner: string;
  member: string;

  // Auth
  welcomeBack: string;
  signInSubtitle: string;
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  createAccount: string;
  createAccountSubtitle: string;
  dontHaveAccount: string;
  alreadyHaveAccount: string;
  continueWithGoogle: string;
  skipForNow: string;

  // Scan
  scanInvoice: string;
  scanBarcode: string;
}

export const en: Translations = {
  // Common
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  add: 'Add',
  search: 'Search',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  ok: 'OK',
  confirm: 'Confirm',
  skip: 'Skip',

  // Tab labels
  tabPantry: 'Pantry',
  tabShopping: 'Shopping',
  tabInsights: 'Insights',
  tabSettings: 'Settings',

  // Pantry screen
  pantryTitle: 'My Pantry',
  pantryEmpty: 'Your pantry is empty',
  pantryEmptySubtitle: 'Add items using the + button, scan a barcode, or scan an invoice',
  pantryDeleteAll: 'Delete All Items',
  pantryDeleteAllConfirm: 'This will permanently delete all {count} item(s) from your pantry, along with their usage/restock history. This cannot be undone.',
  pantryAlreadyEmpty: 'Your pantry is already empty.',
  pantryLowStock: 'Low Stock',
  pantryExpired: 'Expired',
  pantryExpiringSoon: 'Expiring Soon',

  // Sort & Filter
  sortBy: 'Sort by',
  sortName: 'Name',
  sortCategory: 'Category',
  sortStockLevel: 'Stock Level',
  sortExpiry: 'Expiry',
  filterAll: 'All',
  filterLowStock: 'Low Stock',
  filterExpiringSoon: 'Expiring Soon',
  filterExpired: 'Expired',

  // Item Detail
  itemDetail: 'Item Details',
  currentStock: 'Current Stock',
  threshold: 'Threshold',
  purchaseDetails: 'Purchase Details',
  price: 'Price',
  expiry: 'Expiry',
  consumptionMode: 'Consumption Mode',
  manual: 'Manual',
  auto: 'Auto',
  recentActivity: 'Recent Activity',
  noActivity: 'No activity yet',
  logUsage: 'Log Usage',
  restock: 'Restock',
  editItem: 'Edit Item',
  deleteItem: 'Delete Item',

  // Add/Edit Item
  addItem: 'Add Item',
  itemName: 'Item Name',
  category: 'Category',
  unit: 'Unit',
  currentQuantity: 'Current Quantity',
  lowStockThreshold: 'Low Stock Threshold',
  priceOptional: 'Price (optional)',
  expiryOptional: 'Expiry Date (optional)',
  saveItem: 'Save Item',
  saveChanges: 'Save Changes',

  // Shopping List
  shoppingList: 'Shopping List',
  shoppingEmpty: 'Shopping list is empty',
  shoppingEmptySubtitle: 'Add items manually or auto-generate from low stock',
  autoGenerate: 'Auto-Generate',
  share: 'Share',
  clearDone: 'Clear Done',
  recurring: 'Recurring',
  addToList: 'Add to Shopping List',
  confirmPurchase: 'Confirm Purchase',
  quantityNeeded: 'Quantity Needed',

  // Recurring Items
  recurringItems: 'Recurring Items',
  recurringEmpty: 'No recurring items',
  recurringEmptySubtitle: 'Add items you buy regularly. They\'ll be auto-added to your shopping list on schedule.',
  addRecurring: 'Add Recurring Item',
  frequency: 'Frequency',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  nextDue: 'Next',

  // Insights
  insightsTitle: 'Insights',
  totalItems: 'Total Items',
  expiringSoon: 'Expiring Soon',
  expenditure: 'Expenditure',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  allTime: 'All Time',
  lastSixMonths: 'Last 6 Months',
  byCategory: 'By Category',
  weeklyConsumption: 'Weekly Consumption',
  topConsumed: 'Top Consumed (30 days)',
  fastMoving: 'Fast-Moving Items',
  noData: 'No data yet',
  daysLeft: '{days}d left',

  // Settings
  settingsTitle: 'Settings',
  appearance: 'Appearance',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  notifications: 'Notifications',
  enableNotifications: 'Enable Notifications',
  notificationsDescription: 'Get alerts for expiring items (7 days before) and when stock runs low.',
  language: 'Language',
  selectLanguage: 'Select Language',
  alertFrequency: 'Alert Frequency',
  consumptionModeDefault: 'Default Consumption Mode',
  cloudHousehold: 'Cloud & Household',
  signIn: 'Sign In',
  signOut: 'Sign Out',
  signUp: 'Sign Up',
  signedInAs: 'Signed in as',
  manageHousehold: 'Manage Household',
  cloudDescription: 'Sign in to sync your pantry across devices and share with household members.',
  about: 'About',
  version: 'Version',
  replayGuide: 'Replay Welcome Guide',
  dangerZone: 'Danger Zone',
  resetAllData: 'Reset All Data',
  resetWarning: 'This will permanently delete all your items, logs, shopping list, and settings. This cannot be undone.',

  // Household
  household: 'Household',
  createHousehold: 'Create Household',
  joinHousehold: 'Join Household',
  joinWithCode: 'Join with Code',
  inviteCode: 'Invite Code',
  shareCode: 'Share this code with family members to join your household',
  members: 'Members',
  leaveHousehold: 'Leave Household',
  noHousehold: 'No Household',
  noHouseholdSubtitle: 'Create a household to share your pantry with family, or join an existing one.',
  householdName: 'Household Name',
  owner: 'Owner',
  member: 'Member',

  // Auth
  welcomeBack: 'Welcome Back',
  signInSubtitle: 'Sign in to sync your pantry with household members',
  email: 'Email',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  displayName: 'Display Name',
  createAccount: 'Create Account',
  createAccountSubtitle: 'Join to share your pantry with household members',
  dontHaveAccount: "Don't have an account?",
  alreadyHaveAccount: 'Already have an account?',
  continueWithGoogle: 'Continue with Google',
  skipForNow: 'Skip for now (use offline only)',

  // Scan
  scanInvoice: 'Scan Invoice',
  scanBarcode: 'Scan Barcode',
};

export const hi: Translations = {
  // Common
  save: 'सहेजें',
  cancel: 'रद्द करें',
  delete: 'हटाएं',
  edit: 'संपादित करें',
  add: 'जोड़ें',
  search: 'खोजें',
  loading: 'लोड हो रहा है...',
  error: 'त्रुटि',
  success: 'सफल',
  ok: 'ठीक है',
  confirm: 'पुष्टि करें',
  skip: 'छोड़ें',

  // Tab labels
  tabPantry: 'पैंट्री',
  tabShopping: 'खरीदारी',
  tabInsights: 'विश्लेषण',
  tabSettings: 'सेटिंग्स',

  // Pantry screen
  pantryTitle: 'मेरी पैंट्री',
  pantryEmpty: 'आपकी पैंट्री खाली है',
  pantryEmptySubtitle: '+ बटन से आइटम जोड़ें, बारकोड स्कैन करें, या इनवॉइस स्कैन करें',
  pantryDeleteAll: 'सभी आइटम हटाएं',
  pantryDeleteAllConfirm: 'यह आपकी पैंट्री से सभी {count} आइटम को स्थायी रूप से हटा देगा। यह वापस नहीं किया जा सकता।',
  pantryAlreadyEmpty: 'आपकी पैंट्री पहले से खाली है।',
  pantryLowStock: 'कम स्टॉक',
  pantryExpired: 'एक्सपायर्ड',
  pantryExpiringSoon: 'जल्द एक्सपायर',

  // Sort & Filter
  sortBy: 'क्रमबद्ध करें',
  sortName: 'नाम',
  sortCategory: 'श्रेणी',
  sortStockLevel: 'स्टॉक स्तर',
  sortExpiry: 'एक्सपायरी',
  filterAll: 'सभी',
  filterLowStock: 'कम स्टॉक',
  filterExpiringSoon: 'जल्द एक्सपायर',
  filterExpired: 'एक्सपायर्ड',

  // Item Detail
  itemDetail: 'आइटम विवरण',
  currentStock: 'वर्तमान स्टॉक',
  threshold: 'न्यूनतम सीमा',
  purchaseDetails: 'खरीद विवरण',
  price: 'कीमत',
  expiry: 'एक्सपायरी',
  consumptionMode: 'उपभोग मोड',
  manual: 'मैनुअल',
  auto: 'ऑटो',
  recentActivity: 'हाल की गतिविधि',
  noActivity: 'अभी तक कोई गतिविधि नहीं',
  logUsage: 'उपयोग दर्ज करें',
  restock: 'रीस्टॉक',
  editItem: 'आइटम संपादित करें',
  deleteItem: 'आइटम हटाएं',

  // Add/Edit Item
  addItem: 'आइटम जोड़ें',
  itemName: 'आइटम का नाम',
  category: 'श्रेणी',
  unit: 'इकाई',
  currentQuantity: 'वर्तमान मात्रा',
  lowStockThreshold: 'कम स्टॉक सीमा',
  priceOptional: 'कीमत (वैकल्पिक)',
  expiryOptional: 'एक्सपायरी तिथि (वैकल्पिक)',
  saveItem: 'आइटम सहेजें',
  saveChanges: 'बदलाव सहेजें',

  // Shopping List
  shoppingList: 'खरीदारी सूची',
  shoppingEmpty: 'खरीदारी सूची खाली है',
  shoppingEmptySubtitle: 'मैन्युअल रूप से आइटम जोड़ें या कम स्टॉक से ऑटो-जनरेट करें',
  autoGenerate: 'ऑटो-जनरेट',
  share: 'शेयर',
  clearDone: 'पूर्ण हटाएं',
  recurring: 'आवर्ती',
  addToList: 'सूची में जोड़ें',
  confirmPurchase: 'खरीद की पुष्टि',
  quantityNeeded: 'आवश्यक मात्रा',

  // Recurring Items
  recurringItems: 'आवर्ती आइटम',
  recurringEmpty: 'कोई आवर्ती आइटम नहीं',
  recurringEmptySubtitle: 'नियमित रूप से खरीदे जाने वाले आइटम जोड़ें। वे स्वचालित रूप से आपकी खरीदारी सूची में जुड़ जाएंगे।',
  addRecurring: 'आवर्ती आइटम जोड़ें',
  frequency: 'आवृत्ति',
  daily: 'दैनिक',
  weekly: 'साप्ताहिक',
  biweekly: 'हर 2 सप्ताह',
  monthly: 'मासिक',
  nextDue: 'अगला',

  // Insights
  insightsTitle: 'विश्लेषण',
  totalItems: 'कुल आइटम',
  expiringSoon: 'जल्द एक्सपायर',
  expenditure: 'खर्च',
  thisMonth: 'इस महीने',
  lastMonth: 'पिछला महीना',
  allTime: 'कुल',
  lastSixMonths: 'पिछले 6 महीने',
  byCategory: 'श्रेणी अनुसार',
  weeklyConsumption: 'साप्ताहिक उपभोग',
  topConsumed: 'सबसे ज्यादा उपभोग (30 दिन)',
  fastMoving: 'तेजी से खत्म होने वाले',
  noData: 'अभी तक कोई डेटा नहीं',
  daysLeft: '{days} दिन बाकी',

  // Settings
  settingsTitle: 'सेटिंग्स',
  appearance: 'दिखावट',
  light: 'लाइट',
  dark: 'डार्क',
  system: 'सिस्टम',
  notifications: 'सूचनाएं',
  enableNotifications: 'सूचनाएं चालू करें',
  notificationsDescription: 'एक्सपायर होने वाले आइटम (7 दिन पहले) और कम स्टॉक की सूचना पाएं।',
  language: 'भाषा',
  selectLanguage: 'भाषा चुनें',
  alertFrequency: 'अलर्ट आवृत्ति',
  consumptionModeDefault: 'डिफ़ॉल्ट उपभोग मोड',
  cloudHousehold: 'क्लाउड और परिवार',
  signIn: 'साइन इन',
  signOut: 'साइन आउट',
  signUp: 'साइन अप',
  signedInAs: 'साइन इन',
  manageHousehold: 'परिवार प्रबंधित करें',
  cloudDescription: 'अपनी पैंट्री को डिवाइस पर सिंक करने और परिवार के सदस्यों के साथ शेयर करने के लिए साइन इन करें।',
  about: 'ऐप के बारे में',
  version: 'संस्करण',
  replayGuide: 'गाइड दोबारा देखें',
  dangerZone: 'खतरनाक क्षेत्र',
  resetAllData: 'सभी डेटा रीसेट करें',
  resetWarning: 'यह आपके सभी आइटम, लॉग, खरीदारी सूची और सेटिंग्स को स्थायी रूप से हटा देगा। यह वापस नहीं किया जा सकता।',

  // Household
  household: 'परिवार',
  createHousehold: 'परिवार बनाएं',
  joinHousehold: 'परिवार में शामिल हों',
  joinWithCode: 'कोड से जुड़ें',
  inviteCode: 'आमंत्रण कोड',
  shareCode: 'इस कोड को परिवार के सदस्यों के साथ शेयर करें',
  members: 'सदस्य',
  leaveHousehold: 'परिवार छोड़ें',
  noHousehold: 'कोई परिवार नहीं',
  noHouseholdSubtitle: 'अपनी पैंट्री शेयर करने के लिए परिवार बनाएं या मौजूदा में शामिल हों।',
  householdName: 'परिवार का नाम',
  owner: 'मालिक',
  member: 'सदस्य',

  // Auth
  welcomeBack: 'वापस स्वागत है',
  signInSubtitle: 'परिवार के सदस्यों के साथ पैंट्री सिंक करने के लिए साइन इन करें',
  email: 'ईमेल',
  password: 'पासवर्ड',
  confirmPassword: 'पासवर्ड की पुष्टि',
  displayName: 'प्रदर्शन नाम',
  createAccount: 'अकाउंट बनाएं',
  createAccountSubtitle: 'परिवार के साथ पैंट्री शेयर करने के लिए जुड़ें',
  dontHaveAccount: 'अकाउंट नहीं है?',
  alreadyHaveAccount: 'पहले से अकाउंट है?',
  continueWithGoogle: 'Google से जारी रखें',
  skipForNow: 'अभी छोड़ें (केवल ऑफलाइन)',

  // Scan
  scanInvoice: 'इनवॉइस स्कैन',
  scanBarcode: 'बारकोड स्कैन',
};

const translations: Record<Language, Translations> = { en, hi };

export default translations;

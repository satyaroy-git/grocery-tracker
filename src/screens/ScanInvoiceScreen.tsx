import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { DEFAULT_CATEGORIES, UNITS_OF_MEASUREMENT } from '../constants/categories';
import { createItemsBatch, CreateItemInput } from '../database';
import {
  parseInvoiceImage,
  parseInvoiceText,
  convertToCreateItemInputs,
  ParsedInvoiceItem,
  InvoiceParseResult,
} from '../services/invoiceParser';
import { hasApiKey, setApiKey } from '../services/config';

type ParseMode = 'image' | 'text';
type ScreenState = 'input' | 'parsing' | 'review' | 'saving' | 'done';

// Picker target identifies which item + which field (category/unit) is being edited
interface PickerTarget {
  index: number;
  field: 'category' | 'unit';
}

export default function ScanInvoiceScreen() {
  const navigation = useNavigation();

  const [screenState, setScreenState] = useState<ScreenState>('input');
  const [parseMode, setParseMode] = useState<ParseMode>('image');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [invoiceText, setInvoiceText] = useState('');
  const [parseResult, setParseResult] = useState<InvoiceParseResult | null>(null);
  // Editable copy of the parsed items — lets the user correct category/unit/quantity
  // right in the review screen before anything is saved to the pantry.
  const [editableItems, setEditableItems] = useState<ParsedInvoiceItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean>(true);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const configured = await hasApiKey();
    setApiKeyConfigured(configured);
    if (!configured) {
      setShowApiKeyInput(true);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim() || apiKeyInput.trim().length < 10) {
      Alert.alert('Invalid Key', 'Please enter a valid Gemini API key from Google AI Studio.');
      return;
    }
    await setApiKey(apiKeyInput.trim());
    setApiKeyConfigured(true);
    setShowApiKeyInput(false);
    Alert.alert('Success', 'API key saved successfully!');
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to scan invoices.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // Expo SDK 54: MediaTypeOptions is deprecated in favor of a MediaType array
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to capture invoice photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleParse = async () => {
    if (!apiKeyConfigured) {
      setShowApiKeyInput(true);
      return;
    }

    if (parseMode === 'image' && !imageUri) {
      Alert.alert('No Image', 'Please select or capture an invoice image first.');
      return;
    }

    if (parseMode === 'text' && !invoiceText.trim()) {
      Alert.alert('No Text', 'Please paste your invoice text first.');
      return;
    }

    setScreenState('parsing');

    let result: InvoiceParseResult;
    if (parseMode === 'image') {
      result = await parseInvoiceImage(imageUri!);
    } else {
      result = await parseInvoiceText(invoiceText);
    }

    setParseResult(result);

    if (result.success && result.items.length > 0) {
      // Select all items by default, and make an editable copy for the review screen
      setSelectedItems(new Set(result.items.map((_, index) => index)));
      setEditableItems(result.items.map((item) => ({ ...item })));
      setScreenState('review');
    } else {
      setScreenState('input');
      Alert.alert(
        'Parsing Failed',
        result.error || 'Could not extract items from the invoice. Try a clearer image or paste the text instead.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(editableItems.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  // Update a single field (category or unit) on one item in the editable list
  const updateItemField = (index: number, field: 'category' | 'unit' | 'quantity', value: string | number) => {
    setEditableItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as ParsedInvoiceItem;
      return next;
    });
  };

  const handleAddToPantry = async () => {
    if (editableItems.length === 0 || selectedItems.size === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to add.');
      return;
    }

    setScreenState('saving');

    try {
      const itemsToAdd = editableItems.filter((_, index) => selectedItems.has(index));
      const createInputs: CreateItemInput[] = convertToCreateItemInputs(itemsToAdd);
      await createItemsBatch(createInputs);

      setScreenState('done');
      Alert.alert(
        'Success!',
        `Added ${createInputs.length} item${createInputs.length > 1 ? 's' : ''} to your pantry.`,
        [{ text: 'Great!', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      setScreenState('review');
      Alert.alert('Error', 'Failed to save items. Please try again.');
    }
  };

  const handleRetry = () => {
    setScreenState('input');
    setParseResult(null);
    setEditableItems([]);
    setSelectedItems(new Set());
  };

  // Render API key input
  if (showApiKeyInput) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.apiKeySection}>
            <Ionicons name="key-outline" size={48} color={COLORS.primary} />
            <Text style={styles.apiKeyTitle}>Gemini API Key Required</Text>
            <Text style={styles.apiKeyDescription}>
              To parse grocery invoices, PantryPal uses Google's Gemini AI.
              Gemini offers a free tier with no credit card required.
            </Text>
            <Text style={styles.apiKeyHint}>
              Get your free key from: aistudio.google.com/apikey
            </Text>
            <TextInput
              style={styles.apiKeyInput}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="AIzaSy..."
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveApiKey}>
              <Text style={styles.primaryButtonText}>Save API Key</Text>
            </TouchableOpacity>
            {apiKeyConfigured && (
              <TouchableOpacity
                style={styles.textButton}
                onPress={() => setShowApiKeyInput(false)}
              >
                <Text style={styles.textButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Render parsing state
  if (screenState === 'parsing' || screenState === 'saving') {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {screenState === 'parsing'
              ? 'Analyzing invoice with AI...\nThis may take a few seconds.'
              : 'Adding items to your pantry...'}
          </Text>
        </View>
      </View>
    );
  }

  // Render review state
  if (screenState === 'review' && parseResult) {
    const selectedUnitLabel = (unit: string) =>
      UNITS_OF_MEASUREMENT.find((u) => u.value === unit)?.label || unit;

    return (
      <View style={styles.container}>
        <View style={styles.reviewHeader}>
          {parseResult.storeName && (
            <Text style={styles.storeName}>{parseResult.storeName}</Text>
          )}
          <Text style={styles.itemCount}>
            {editableItems.length} items found
            {parseResult.totalAmount ? ` | Total: ₹${parseResult.totalAmount}` : ''}
          </Text>
          <Text style={styles.editHint}>
            Tap category or unit on any item below to change it.
          </Text>
          <View style={styles.selectionRow}>
            <TouchableOpacity onPress={selectAll}>
              <Text style={styles.selectionLink}>Select All</Text>
            </TouchableOpacity>
            <Text style={styles.selectionDivider}>|</Text>
            <TouchableOpacity onPress={deselectAll}>
              <Text style={styles.selectionLink}>Deselect All</Text>
            </TouchableOpacity>
            <Text style={styles.selectedCount}>
              {selectedItems.size} selected
            </Text>
          </View>
        </View>

        <FlatList
          data={editableItems}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.reviewItem,
                selectedItems.has(index) && styles.reviewItemSelected,
              ]}
            >
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleItemSelection(index)}
              >
                {selectedItems.has(index) ? (
                  <Ionicons name="checkbox" size={24} color={COLORS.primary} />
                ) : (
                  <Ionicons name="square-outline" size={24} color={COLORS.textLight} />
                )}
              </TouchableOpacity>

              <View style={styles.reviewItemInfo}>
                <Text style={styles.reviewItemName}>
                  {item.brand ? `${item.brand} ` : ''}{item.name}
                  {item.price ? (
                    <Text style={styles.reviewItemPrice}> · ₹{item.price}</Text>
                  ) : null}
                </Text>

                <View style={styles.editableRow}>
                  {/* Quantity stepper */}
                  <View style={styles.qtyStepper}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() =>
                        updateItemField(index, 'quantity', Math.max(1, item.quantity - 1))
                      }
                    >
                      <Ionicons name="remove" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateItemField(index, 'quantity', item.quantity + 1)}
                    >
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Unit chip - tap to change */}
                  <TouchableOpacity
                    style={styles.editChip}
                    onPress={() => setPickerTarget({ index, field: 'unit' })}
                  >
                    <Text style={styles.editChipText}>{selectedUnitLabel(item.unit)}</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
                  </TouchableOpacity>

                  {/* Category chip - tap to change */}
                  <TouchableOpacity
                    style={styles.editChip}
                    onPress={() => setPickerTarget({ index, field: 'category' })}
                  >
                    <Text style={styles.editChipText}>{item.category}</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />

        <View style={styles.reviewFooter}>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, selectedItems.size === 0 && styles.addButtonDisabled]}
            onPress={handleAddToPantry}
            disabled={selectedItems.size === 0}
          >
            <Ionicons name="add-circle" size={20} color={COLORS.surface} />
            <Text style={styles.addButtonText}>
              Add {selectedItems.size} to Pantry
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category/Unit picker modal (bottom sheet style overlay) */}
        {pickerTarget && (
          <View style={styles.pickerOverlay}>
            <TouchableOpacity
              style={styles.pickerOverlayBackdrop}
              onPress={() => setPickerTarget(null)}
            />
            <View style={styles.pickerSheet}>
              <View style={styles.pickerSheetHeader}>
                <Text style={styles.pickerSheetTitle}>
                  Select {pickerTarget.field === 'unit' ? 'Unit' : 'Category'}
                </Text>
                <TouchableOpacity onPress={() => setPickerTarget(null)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={pickerTarget.field === 'unit' ? UNITS_OF_MEASUREMENT : DEFAULT_CATEGORIES.map((c) => ({ label: c, value: c }))}
                keyExtractor={(opt) => opt.value}
                style={styles.pickerSheetList}
                renderItem={({ item: option }) => {
                  const currentValue =
                    pickerTarget.field === 'unit'
                      ? editableItems[pickerTarget.index]?.unit
                      : editableItems[pickerTarget.index]?.category;
                  const isSelected = currentValue === option.value;
                  return (
                    <TouchableOpacity
                      style={[styles.pickerSheetOption, isSelected && styles.pickerSheetOptionSelected]}
                      onPress={() => {
                        updateItemField(pickerTarget.index, pickerTarget.field, option.value);
                        setPickerTarget(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerSheetOptionText,
                          isSelected && styles.pickerSheetOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        )}
      </View>
    );
  }

  // Render input state (default)
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, parseMode === 'image' && styles.modeButtonActive]}
            onPress={() => setParseMode('image')}
          >
            <Ionicons
              name="camera-outline"
              size={20}
              color={parseMode === 'image' ? COLORS.surface : COLORS.textSecondary}
            />
            <Text style={[styles.modeButtonText, parseMode === 'image' && styles.modeButtonTextActive]}>
              Scan Image
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, parseMode === 'text' && styles.modeButtonActive]}
            onPress={() => setParseMode('text')}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={parseMode === 'text' ? COLORS.surface : COLORS.textSecondary}
            />
            <Text style={[styles.modeButtonText, parseMode === 'text' && styles.modeButtonTextActive]}>
              Paste Text
            </Text>
          </TouchableOpacity>
        </View>

        {parseMode === 'image' ? (
          <View style={styles.imageSection}>
            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.accent} />
              <Text style={styles.infoText}>
                Take a photo or select a screenshot of your Blinkit, Instamart, BigBasket, or other grocery invoice. AI will extract all items automatically.
              </Text>
            </View>

            {/* Image Preview */}
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="close-circle" size={28} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.placeholderText}>No invoice selected</Text>
              </View>
            )}

            {/* Image Buttons */}
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                <Ionicons name="camera" size={24} color={COLORS.primary} />
                <Text style={styles.imageButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Ionicons name="images" size={24} color={COLORS.primary} />
                <Text style={styles.imageButtonText}>Pick from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.textSection}>
            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.accent} />
              <Text style={styles.infoText}>
                Copy your order details from the delivery app and paste them here. Works with Blinkit, Swiggy Instamart, BigBasket, Zepto, etc.
              </Text>
            </View>

            <TextInput
              style={styles.textInput}
              value={invoiceText}
              onChangeText={setInvoiceText}
              placeholder={`Paste your invoice/order text here...\n\nExample:\nAmul Toned Milk 500ml x2 - ₹56\nAashirvaad Atta 5kg - ₹299\nOnion 1kg - ₹35\nTomato 500g - ₹20`}
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Parse Button */}
        <TouchableOpacity
          style={[
            styles.parseButton,
            (parseMode === 'image' && !imageUri) && styles.parseButtonDisabled,
            (parseMode === 'text' && !invoiceText.trim()) && styles.parseButtonDisabled,
          ]}
          onPress={handleParse}
          disabled={
            (parseMode === 'image' && !imageUri) ||
            (parseMode === 'text' && !invoiceText.trim())
          }
        >
          <Ionicons name="sparkles" size={22} color={COLORS.surface} />
          <Text style={styles.parseButtonText}>Parse Invoice with AI</Text>
        </TouchableOpacity>

        {/* Settings Link */}
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={() => setShowApiKeyInput(true)}
        >
          <Ionicons name="key-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.settingsLinkText}>Change API Key</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  modeButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: COLORS.surface,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent + '10',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Image Section
  imageSection: {},
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  imagePreview: {
    width: '100%',
    height: 300,
  },
  removeImageButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  imagePlaceholder: {
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  placeholderText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
  },
  imageButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Text Section
  textSection: {},
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 200,
    lineHeight: 22,
  },

  // Parse Button
  parseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  parseButtonDisabled: {
    opacity: 0.5,
  },
  parseButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },

  // Settings Link
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  settingsLinkText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // API Key Section
  apiKeySection: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  apiKeyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  apiKeyDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  apiKeyHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  apiKeyInput: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  textButton: {
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  textButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },

  // Review State
  reviewHeader: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  storeName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemCount: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  selectionLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    fontWeight: '600',
  },
  selectionDivider: {
    color: COLORS.textLight,
  },
  selectedCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: 'auto',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  reviewItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  reviewItemSelected: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '10',
  },
  checkbox: {
    marginRight: SPACING.sm,
  },
  reviewItemInfo: {
    flex: 1,
  },
  reviewItemName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewItemPrice: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  reviewItemDetails: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  editHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  editableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    gap: 4,
  },
  editChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Category/Unit picker sheet
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  pickerOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
  },
  pickerSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '70%',
    ...SHADOWS.lg,
  },
  pickerSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerSheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  pickerSheetList: {
    paddingBottom: SPACING.lg,
  },
  pickerSheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pickerSheetOptionSelected: {
    backgroundColor: COLORS.primaryLight + '15',
  },
  pickerSheetOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  pickerSheetOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  reviewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
    ...SHADOWS.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  retryButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    ...SHADOWS.md,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.surface,
    fontWeight: '700',
  },
});

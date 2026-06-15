import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { parseOrderText, ParsedItem, PASTE_EXAMPLES } from '../utils/orderParser';
import { extractTextFromImage, cleanReceiptText } from '../utils/receiptOcr';
import { createItem } from '../database';

type Step = 'choose' | 'paste' | 'review';

export default function BulkImportScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('choose');
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const handleParse = () => {
    const items = parseOrderText(inputText);
    if (items.length === 0) {
      Alert.alert('No Items Found', 'Could not detect any grocery items from the text. Try pasting your order details or a list of items.');
      return;
    }
    setParsedItems(items);
    setStep('review');
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to scan receipts.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed to upload receipts.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            base64: true,
          });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setReceiptImage(asset.uri);
      setScanning(true);

      if (asset.base64) {
        const ocrResult = await extractTextFromImage(asset.base64);
        if (ocrResult.success && ocrResult.text) {
          const cleanedText = cleanReceiptText(ocrResult.text);
          setInputText(cleanedText);
          setScanning(false);
          setStep('paste'); // Go to paste step so user can review/edit extracted text
          Alert.alert(
            'Text Extracted!',
            'We extracted text from your receipt. Review it below, then tap "Parse Items" to continue.',
          );
        } else {
          setScanning(false);
          setStep('paste');
          Alert.alert(
            'OCR Failed',
            ocrResult.error || 'Could not read text from the image. You can manually type or paste the items below.',
          );
        }
      } else {
        setScanning(false);
        setStep('paste');
        Alert.alert('Note', 'Could not process image. Please manually type the items from your receipt.');
      }
    } catch (error: any) {
      setScanning(false);
      setStep('paste');
      Alert.alert('Error', 'Failed to process the image. Please try again or paste text manually.');
    }
  };

  const toggleItem = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  const updateItemField = (id: string, field: keyof ParsedItem, value: any) => {
    setParsedItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const selectAll = () => setParsedItems((prev) => prev.map((i) => ({ ...i, selected: true })));
  const deselectAll = () => setParsedItems((prev) => prev.map((i) => ({ ...i, selected: false })));

  const selectedCount = parsedItems.filter((i) => i.selected).length;

  const handleImport = async () => {
    const itemsToImport = parsedItems.filter((i) => i.selected);
    if (itemsToImport.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to import.');
      return;
    }

    setImporting(true);
    try {
      let successCount = 0;
      for (const item of itemsToImport) {
        await createItem({
          name: item.name,
          category: item.category,
          unit: item.unit,
          currentQuantity: item.quantity,
          threshold: Math.max(1, Math.round(item.quantity * 0.2)),
          consumptionMode: 'manual',
        });
        successCount++;
      }
      Alert.alert(
        'Import Complete!',
        `Successfully added ${successCount} items to your pantry.`,
        [{ text: 'Great!', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Some items failed to import. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  // CHOOSE METHOD STEP
  if (step === 'choose') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: SPACING.xxl }}>
        <View style={styles.headerCard}>
          <Ionicons name="receipt-outline" size={36} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Import Groceries</Text>
          <Text style={styles.headerSubtitle}>
            Import items from your Blinkit, Instamart, Flipkart, or Zepto orders
          </Text>
        </View>

        {scanning && (
          <View style={styles.scanningCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.scanningText}>Scanning receipt...</Text>
          </View>
        )}

        {/* Upload Receipt */}
        <Text style={styles.sectionLabel}>SCAN RECEIPT</Text>
        <TouchableOpacity style={styles.optionCard} onPress={() => handlePickImage(true)}>
          <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryLight + '20' }]}>
            <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Take Photo of Receipt</Text>
            <Text style={styles.optionDesc}>Snap a photo of your grocery bill or order receipt</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => handlePickImage(false)}>
          <View style={[styles.optionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
            <Ionicons name="image-outline" size={28} color={COLORS.secondary} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Upload from Gallery</Text>
            <Text style={styles.optionDesc}>Pick a screenshot or photo of your order from gallery</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* Paste Text */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>OR PASTE TEXT</Text>
        <TouchableOpacity style={styles.optionCard} onPress={() => setStep('paste')}>
          <View style={[styles.optionIcon, { backgroundColor: COLORS.success + '20' }]}>
            <Ionicons name="clipboard-outline" size={28} color={COLORS.success} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Paste Order Text</Text>
            <Text style={styles.optionDesc}>Copy-paste from order email, SMS, or app notification</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* Supported apps */}
        <View style={styles.supportedCard}>
          <Text style={styles.supportedTitle}>Supported Apps</Text>
          <View style={styles.appsRow}>
            {['Blinkit', 'Instamart', 'Flipkart', 'Zepto', 'BigBasket', 'JioMart'].map((app) => (
              <View key={app} style={styles.appBadge}>
                <Text style={styles.appBadgeText}>{app}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  // PASTE STEP
  if (step === 'paste') {
    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => setStep('choose')} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {receiptImage && (
          <View style={styles.receiptPreview}>
            <Image source={{ uri: receiptImage }} style={styles.receiptImage} resizeMode="contain" />
            <Text style={styles.receiptHint}>Extracted text shown below. Edit if needed.</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>
            {receiptImage ? 'Extracted Text (edit if needed)' : 'Paste Order Text'}
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder={"Paste your order here...\n\nExamples:\n- Tata Salt 1kg\n- Amul Butter 500g\n- Onion 2 kg"}
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            value={inputText}
            onChangeText={setInputText}
          />
        </View>

        {/* Sample buttons */}
        {!receiptImage && (
          <View style={styles.samplesSection}>
            <Text style={styles.samplesTitle}>Try a sample:</Text>
            {PASTE_EXAMPLES.map((sample, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sampleChip}
                onPress={() => setInputText(sample.text)}
              >
                <Ionicons name="document-text-outline" size={14} color={COLORS.primary} />
                <Text style={styles.sampleChipText}>{sample.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.parseButton, !inputText.trim() && styles.buttonDisabled]}
          onPress={handleParse}
          disabled={!inputText.trim()}
        >
          <Ionicons name="scan-outline" size={20} color="#fff" />
          <Text style={styles.parseButtonText}>Parse Items</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    );
  }

  // REVIEW STEP
  return (
    <View style={styles.container}>
      <View style={styles.reviewHeader}>
        <TouchableOpacity onPress={() => setStep('paste')} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Edit Text</Text>
        </TouchableOpacity>
        <Text style={styles.reviewTitle}>Review ({selectedCount}/{parsedItems.length})</Text>
      </View>

      <View style={styles.selectActions}>
        <TouchableOpacity onPress={selectAll}>
          <Text style={styles.selectLink}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={deselectAll}>
          <Text style={styles.selectLink}>Deselect All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={parsedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, !item.selected && styles.itemCardDeselected]}>
            <TouchableOpacity style={styles.checkbox} onPress={() => toggleItem(item.id)}>
              <Ionicons
                name={item.selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={item.selected ? COLORS.primary : COLORS.textLight}
              />
            </TouchableOpacity>
            <View style={styles.itemContent}>
              <TextInput
                style={styles.itemNameInput}
                value={item.name}
                onChangeText={(v) => updateItemField(item.id, 'name', v)}
              />
              <View style={styles.itemMeta}>
                <TextInput
                  style={styles.itemQtyInput}
                  value={item.quantity.toString()}
                  keyboardType="decimal-pad"
                  onChangeText={(v) => updateItemField(item.id, 'quantity', parseFloat(v) || 0)}
                />
                <Text style={styles.itemUnit}>{item.unit}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.importButton, (selectedCount === 0 || importing) && styles.buttonDisabled]}
          onPress={handleImport}
          disabled={selectedCount === 0 || importing}
        >
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={styles.importButtonText}>
            {importing ? 'Importing...' : `Import ${selectedCount} Items to Pantry`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  optionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  optionDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  supportedCard: {
    margin: SPACING.md,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  supportedTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  appsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  appBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appBadgeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  scanningCard: {
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
  },
  scanningText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  // Paste step
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  backText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  receiptPreview: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  receiptImage: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.background,
  },
  receiptHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  field: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 180,
  },
  samplesSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  samplesTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  sampleChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  parseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  parseButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Review step
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.md,
  },
  reviewTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  selectActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.lg,
  },
  selectLink: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  itemCardDeselected: {
    opacity: 0.5,
  },
  checkbox: {
    marginRight: SPACING.sm,
  },
  itemContent: {
    flex: 1,
  },
  itemNameInput: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 2,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  itemQtyInput: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 40,
    textAlign: 'center',
  },
  itemUnit: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: 'auto',
  },
  categoryText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  importButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

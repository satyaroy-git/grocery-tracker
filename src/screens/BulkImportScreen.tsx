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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { parseOrderText, ParsedItem, PASTE_EXAMPLES } from '../utils/orderParser';
import { createItem } from '../database';

type Step = 'paste' | 'review';

export default function BulkImportScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('paste');
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    const items = parseOrderText(inputText);
    if (items.length === 0) {
      Alert.alert('No Items Found', 'Could not detect any grocery items from the text. Try pasting your order details or a list of items.');
      return;
    }
    setParsedItems(items);
    setStep('review');
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

  const handleUseSample = (sampleText: string) => {
    setInputText(sampleText);
  };

  // PASTE STEP
  if (step === 'paste') {
    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <Ionicons name="clipboard-outline" size={32} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Quick Import</Text>
          <Text style={styles.headerSubtitle}>
            Paste your order details from Instamart, Blinkit, Flipkart, Zepto, or any grocery app. You can also paste from emails or messages.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Paste Order Text</Text>
          <TextInput
            style={styles.textArea}
            placeholder={"Paste your order here...\n\nExamples:\n- Tata Salt 1kg\n- Amul Butter 500g\n- Onion 2 kg\n- Milk 1 ltr"}
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            value={inputText}
            onChangeText={setInputText}
          />
        </View>

        {/* Sample buttons */}
        <View style={styles.samplesSection}>
          <Text style={styles.samplesTitle}>Try a sample:</Text>
          {PASTE_EXAMPLES.map((sample, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.sampleChip}
              onPress={() => handleUseSample(sample.text)}
            >
              <Ionicons name="document-text-outline" size={14} color={COLORS.primary} />
              <Text style={styles.sampleChipText}>{sample.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for best results:</Text>
          <Text style={styles.tipItem}>• Copy order details from email/SMS confirmations</Text>
          <Text style={styles.tipItem}>• Supports formats: "Item 500g", "2 x Item", "Item, Item"</Text>
          <Text style={styles.tipItem}>• Works with Instamart, Blinkit, Zepto, BigBasket, Flipkart</Text>
          <Text style={styles.tipItem}>• Prices and order IDs are automatically ignored</Text>
        </View>

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
      {/* Header */}
      <View style={styles.reviewHeader}>
        <TouchableOpacity onPress={() => setStep('paste')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Edit Text</Text>
        </TouchableOpacity>
        <Text style={styles.reviewTitle}>Review Items ({selectedCount}/{parsedItems.length})</Text>
      </View>

      {/* Select actions */}
      <View style={styles.selectActions}>
        <TouchableOpacity onPress={selectAll}>
          <Text style={styles.selectLink}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={deselectAll}>
          <Text style={styles.selectLink}>Deselect All</Text>
        </TouchableOpacity>
      </View>

      {/* Items list */}
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

      {/* Bottom bar */}
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
  tipsCard: {
    backgroundColor: COLORS.warningBg,
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  tipsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tipItem: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
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

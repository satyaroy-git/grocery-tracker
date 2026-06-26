import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { parseOrderText, ParsedItem, PASTE_EXAMPLES } from '../utils/orderParser';
import { createItem } from '../database';

type Step = 'guide' | 'paste' | 'review';

export default function BulkImportScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('guide');
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    const items = parseOrderText(inputText);
    if (items.length === 0) {
      Alert.alert('No Items Found', 'Could not detect grocery items. Make sure you have one item per line.');
      return;
    }
    setParsedItems(items);
    setStep('review');
  };

  const toggleItem = (id: string) => {
    setParsedItems((prev) => prev.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const updateItemField = (id: string, field: keyof ParsedItem, value: any) => {
    setParsedItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const selectAll = () => setParsedItems((prev) => prev.map((i) => ({ ...i, selected: true })));
  const deselectAll = () => setParsedItems((prev) => prev.map((i) => ({ ...i, selected: false })));
  const selectedCount = parsedItems.filter((i) => i.selected).length;

  const handleImport = async () => {
    const itemsToImport = parsedItems.filter((i) => i.selected);
    if (itemsToImport.length === 0) { Alert.alert('No Items', 'Select at least one item.'); return; }
    setImporting(true);
    try {
      for (const item of itemsToImport) {
        await createItem({ name: item.name, category: item.category, unit: item.unit, currentQuantity: item.quantity, threshold: 0, consumptionMode: 'manual' });
      }
      Alert.alert('Done!', `Added ${itemsToImport.length} items to pantry.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) { Alert.alert('Error', 'Some items failed.'); }
    finally { setImporting(false); }
  };

  // ===== GUIDE STEP =====
  if (step === 'guide') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        <View style={styles.headerCard}>
          <Ionicons name="receipt-outline" size={36} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Import from Order</Text>
          <Text style={styles.headerSubtitle}>Add items from your recent grocery orders in seconds</Text>
        </View>

        {/* How to get text */}
        <Text style={styles.sectionLabel}>HOW TO COPY YOUR ORDER</Text>

        <View style={styles.guideCard}>
          <View style={styles.guideRow}>
            <View style={styles.guideStep}><Text style={styles.guideStepNum}>1</Text></View>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>From Blinkit</Text>
              <Text style={styles.guideDesc}>Open Blinkit app → My Orders → tap an order → "View Invoice" → long press on item list → Copy</Text>
            </View>
          </View>

          <View style={styles.guideDivider} />

          <View style={styles.guideRow}>
            <View style={styles.guideStep}><Text style={styles.guideStepNum}>2</Text></View>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>From Instamart/Swiggy</Text>
              <Text style={styles.guideDesc}>Check your email for "Order Delivered" → open email → copy the item list</Text>
            </View>
          </View>

          <View style={styles.guideDivider} />

          <View style={styles.guideRow}>
            <View style={styles.guideStep}><Text style={styles.guideStepNum}>3</Text></View>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>From Zepto/BigBasket</Text>
              <Text style={styles.guideDesc}>Check SMS or email → copy the order details with item names</Text>
            </View>
          </View>

          <View style={styles.guideDivider} />

          <View style={styles.guideRow}>
            <View style={styles.guideStep}><Text style={styles.guideStepNum}>4</Text></View>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>Type manually</Text>
              <Text style={styles.guideDesc}>Just type item names, one per line. Add quantity like "Rice 5kg" or "Eggs 12"</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('paste')}>
          <Ionicons name="clipboard-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Paste or Type Items</Text>
        </TouchableOpacity>

        {/* Quick tip */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={18} color={COLORS.warning} />
          <Text style={styles.tipText}>Tip: You can also just type "Milk, Eggs, Rice, Oil" — the app will detect items, quantities, and categories automatically!</Text>
        </View>
      </ScrollView>
    );
  }

  // ===== PASTE STEP =====
  if (step === 'paste') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        <TouchableOpacity onPress={() => setStep('guide')} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.field}>
          <Text style={styles.label}>Paste or type items (one per line)</Text>
          <TextInput
            style={styles.textArea}
            placeholder={"Tata Salt 1kg\nAmul Butter 500g\nEggs 12\nMilk 1 liter\nHarpic\nVim Dishwash\nSurf Detergent 1kg"}
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={12}
            textAlignVertical="top"
            value={inputText}
            onChangeText={setInputText}
            autoFocus
          />
        </View>

        <View style={styles.samplesSection}>
          <Text style={styles.samplesTitle}>Or try a sample:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PASTE_EXAMPLES.map((sample, idx) => (
              <TouchableOpacity key={idx} style={styles.sampleChip} onPress={() => setInputText(sample.text)}>
                <Text style={styles.sampleChipText}>{sample.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, !inputText.trim() && styles.btnDisabled]} onPress={handleParse} disabled={!inputText.trim()}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Parse Items ({inputText.split('\n').filter((l) => l.trim().length > 2).length} lines)</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ===== REVIEW STEP =====
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.reviewHeader}>
        <TouchableOpacity onPress={() => setStep('paste')} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Edit</Text>
        </TouchableOpacity>
        <Text style={styles.reviewTitle}>{selectedCount} of {parsedItems.length} selected</Text>
      </View>

      <View style={styles.selectActions}>
        <TouchableOpacity onPress={selectAll}><Text style={styles.selectLink}>Select All</Text></TouchableOpacity>
        <TouchableOpacity onPress={deselectAll}><Text style={styles.selectLink}>Deselect All</Text></TouchableOpacity>
      </View>

      <FlatList
        data={parsedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, !item.selected && styles.itemCardDeselected]}>
            <TouchableOpacity style={styles.checkbox} onPress={() => toggleItem(item.id)}>
              <Ionicons name={item.selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.selected ? COLORS.primary : COLORS.textLight} />
            </TouchableOpacity>
            <View style={styles.itemContent}>
              <TextInput style={styles.itemNameInput} value={item.name} onChangeText={(v) => updateItemField(item.id, 'name', v)} />
              <View style={styles.itemMeta}>
                <TextInput style={styles.itemQtyInput} value={item.quantity.toString()} keyboardType="decimal-pad" onChangeText={(v) => updateItemField(item.id, 'quantity', parseFloat(v) || 0)} />
                <Text style={styles.itemUnit}>{item.unit}</Text>
                <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.category}</Text></View>
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.primaryBtn, (selectedCount === 0 || importing) && styles.btnDisabled]} onPress={handleImport} disabled={selectedCount === 0 || importing}>
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>{importing ? 'Importing...' : `Import ${selectedCount} Items`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerCard: { alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.lg, ...SHADOWS.sm },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm },
  headerSubtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  sectionLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm, letterSpacing: 1 },
  // Guide
  guideCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, ...SHADOWS.sm },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.sm },
  guideStep: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  guideStepNum: { color: '#fff', fontSize: FONT_SIZES.sm, fontWeight: '700' },
  guideContent: { flex: 1 },
  guideTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text },
  guideDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  guideDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xs },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: COLORS.warningBg, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.md },
  tipText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 18 },
  // Paste
  backRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.md },
  backText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '500' },
  field: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs, textTransform: 'uppercase' },
  textArea: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, minHeight: 250 },
  samplesSection: { marginBottom: SPACING.lg },
  samplesTitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  sampleChip: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.primary, marginRight: SPACING.sm },
  sampleChipText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '500' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.md },
  primaryBtnText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  // Review
  reviewHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  reviewTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text, marginLeft: SPACING.sm },
  selectActions: { flexDirection: 'row', paddingHorizontal: SPACING.md, marginVertical: SPACING.sm, gap: SPACING.lg },
  selectLink: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '500' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  itemCardDeselected: { opacity: 0.5 },
  checkbox: { marginRight: SPACING.sm },
  itemContent: { flex: 1 },
  itemNameInput: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.text, padding: 0, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 2 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, gap: SPACING.sm },
  itemQtyInput: { fontSize: FONT_SIZES.sm, color: COLORS.text, fontWeight: '600', backgroundColor: COLORS.background, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm, minWidth: 40, textAlign: 'center' },
  itemUnit: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  categoryBadge: { backgroundColor: COLORS.primaryLight + '20', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.full, marginLeft: 'auto' },
  categoryText: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '500' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
});

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { DEFAULT_CATEGORIES, UNITS_OF_MEASUREMENT } from '../constants/categories';
import { createItem } from '../database';
import { lookupBarcode, BarcodeProductInfo } from '../services/barcodeLookup';
import DateField from '../components/DateField';
import { safeCategoryGuess, guessUnitFromName } from '../utils/itemClassifier';

type ScreenState = 'scanning' | 'looking-up' | 'review' | 'saving';

// Barcode formats commonly used on retail/grocery packaging in India and worldwide.
const SCAN_BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export default function BarcodeScanScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();

  const [screenState, setScreenState] = useState<ScreenState>('scanning');
  const [lookupResult, setLookupResult] = useState<BarcodeProductInfo | null>(null);
  const scannedOnceRef = useRef(false);

  // Editable form fields for the review step - pre-filled from lookup when available
  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  // Once the lookup sets a category/unit (found=true), or the user manually
  // picks one, auto-suggestion from typing stops overriding it.
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [unitTouched, setUnitTouched] = useState(false);
  const [unit, setUnit] = useState(UNITS_OF_MEASUREMENT[0].value);
  const [customUnit, setCustomUnit] = useState('');
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [threshold, setThreshold] = useState('0');
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleBarcodeScanned = async (scanResult: BarcodeScanningResult) => {
    if (scannedOnceRef.current) return; // debounce - camera fires repeatedly while a code is in view
    scannedOnceRef.current = true;

    setScreenState('looking-up');
    const result = await lookupBarcode(scanResult.data);
    setLookupResult(result);

    if (result.found) {
      setName(result.name || '');
      if (result.brand && !result.name) setName(result.brand);
      if (result.category && DEFAULT_CATEGORIES.includes(result.category)) {
        setCategory(result.category);
        setCategoryTouched(true); // lookup provided a category - don't let typing override it
      }
      if (result.unit) {
        setUnit(result.unit);
        setUnitTouched(true);
      }
      if (result.quantity) setCurrentQuantity(String(result.quantity));
    } else {
      // Not found - start with a blank form so name-based auto-suggestion can kick in
      setName('');
      setCategoryTouched(false);
      setUnitTouched(false);
    }

    setScreenState('review');
  };

  // Auto-populate category/unit as the user types, same behavior as
  // AddItemScreen/EditItemScreen - most useful here when a barcode isn't
  // found in the database and the user is filling the form in manually.
  const handleNameChange = (text: string) => {
    setName(text);
    if (!text.trim()) return;

    if (!categoryTouched) {
      const guessedCategory = safeCategoryGuess(text);
      if (guessedCategory !== 'Other') {
        setCategory(guessedCategory);
      }
    }
    if (!unitTouched && !showCustomUnit) {
      const guessedUnit = guessUnitFromName(text, currentQuantity ? parseFloat(currentQuantity) || 1 : 1);
      setUnit(guessedUnit);
    }
  };

  const handleRescan = () => {
    scannedOnceRef.current = false;
    setLookupResult(null);
    setName('');
    setCategory(DEFAULT_CATEGORIES[0]);
    setCategoryTouched(false);
    setUnit(UNITS_OF_MEASUREMENT[0].value);
    setUnitTouched(false);
    setCustomUnit('');
    setShowCustomUnit(false);
    setCurrentQuantity('1');
    setThreshold('0');
    setPrice('');
    setExpiryDate(null);
    setScreenState('scanning');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }
    if (!currentQuantity || parseFloat(currentQuantity) < 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    if (!threshold || parseFloat(threshold) < 0) {
      Alert.alert('Error', 'Please enter a valid threshold.');
      return;
    }
    if (showCustomUnit && !customUnit.trim()) {
      Alert.alert('Error', 'Please enter a custom unit, or pick one from the list.');
      return;
    }
    if (price.trim() && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      Alert.alert('Error', 'Please enter a valid price, or leave it blank.');
      return;
    }

    const finalUnit = showCustomUnit ? customUnit.trim() : unit;

    setSaving(true);
    try {
      await createItem({
        name: name.trim(),
        category,
        unit: finalUnit,
        currentQuantity: parseFloat(currentQuantity),
        threshold: parseFloat(threshold),
        consumptionMode: 'manual',
        autoConsumptionRate: null,
        autoConsumptionFrequency: null,
        price: price.trim() ? parseFloat(price) : null,
        expiryDate,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedUnitLabel = UNITS_OF_MEASUREMENT.find((u) => u.value === unit)?.label || unit;

  // --- Permission states ---
  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="barcode-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          PantryPal needs camera access to scan product barcodes and quickly add items to your pantry.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Scanning state ---
  if (screenState === 'scanning') {
    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: [...SCAN_BARCODE_TYPES] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Align the barcode within the frame</Text>
        </View>
      </View>
    );
  }

  // --- Looking up state ---
  if (screenState === 'looking-up') {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Looking up product...</Text>
      </View>
    );
  }

  // --- Review/edit form (also used for 'saving') ---
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Lookup result banner */}
        {lookupResult && (
          <View
            style={[
              styles.lookupBanner,
              { backgroundColor: lookupResult.found ? COLORS.successBg : COLORS.warningBg },
            ]}
          >
            {lookupResult.imageUrl && (
              <Image source={{ uri: lookupResult.imageUrl }} style={styles.productImage} />
            )}
            <View style={styles.lookupBannerText}>
              <Ionicons
                name={lookupResult.found ? 'checkmark-circle' : 'information-circle'}
                size={18}
                color={lookupResult.found ? COLORS.success : COLORS.warning}
              />
              <Text
                style={[
                  styles.lookupBannerLabel,
                  { color: lookupResult.found ? COLORS.success : COLORS.warning },
                ]}
              >
                {lookupResult.found
                  ? 'Product found - review details below'
                  : lookupResult.error || 'Product not found - please fill in details manually'}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.barcodeText}>Barcode: {lookupResult?.barcode}</Text>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={handleNameChange}
            placeholder="e.g. Rice, Milk, Eggs"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={styles.pickerButtonText}>{category}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              {DEFAULT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pickerOption, category === cat && styles.pickerOptionSelected]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryPicker(false);
                    setCategoryTouched(true);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      category === cat && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Unit */}
        <View style={styles.field}>
          <Text style={styles.label}>Unit of Measurement</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowUnitPicker(!showUnitPicker)}
          >
            <Text style={styles.pickerButtonText}>
              {showCustomUnit ? 'Custom' : selectedUnitLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {showUnitPicker && (
            <ScrollView style={styles.pickerOptions} nestedScrollEnabled>
              {UNITS_OF_MEASUREMENT.map((u) => (
                <TouchableOpacity
                  key={u.value}
                  style={[
                    styles.pickerOption,
                    unit === u.value && !showCustomUnit && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setUnit(u.value);
                    setShowCustomUnit(false);
                    setShowUnitPicker(false);
                    setUnitTouched(true);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      unit === u.value && !showCustomUnit && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.pickerOption, showCustomUnit && styles.pickerOptionSelected]}
                onPress={() => {
                  setShowCustomUnit(true);
                  setShowUnitPicker(false);
                  setUnitTouched(true);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    showCustomUnit && styles.pickerOptionTextSelected,
                  ]}
                >
                  + Custom Unit
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          {showCustomUnit && (
            <TextInput
              style={[styles.input, { marginTop: SPACING.sm }]}
              value={customUnit}
              onChangeText={setCustomUnit}
              placeholder="Enter custom unit (e.g. crate, drum)"
              placeholderTextColor={COLORS.textLight}
            />
          )}
        </View>

        {/* Quantity */}
        <View style={styles.field}>
          <Text style={styles.label}>Current Quantity</Text>
          <TextInput
            style={styles.input}
            value={currentQuantity}
            onChangeText={setCurrentQuantity}
            placeholder="0"
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Threshold */}
        <View style={styles.field}>
          <Text style={styles.label}>Low Stock Threshold</Text>
          <TextInput
            style={styles.input}
            value={threshold}
            onChangeText={setThreshold}
            placeholder="Alert when below this amount"
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Price (optional) */}
        <View style={styles.field}>
          <Text style={styles.label}>Price (optional)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 199"
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Expiry Date (optional) */}
        <DateField
          label="Expiry Date (optional)"
          value={expiryDate}
          onChange={setExpiryDate}
          placeholder="No expiry date set"
        />

        {/* Buttons */}
        <TouchableOpacity style={styles.rescanButton} onPress={handleRescan}>
          <Ionicons name="scan-outline" size={20} color={COLORS.primary} />
          <Text style={styles.rescanButtonText}>Scan a Different Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="checkmark" size={22} color={COLORS.surface} />
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Add to Pantry'}</Text>
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '75%',
    height: 160,
    borderWidth: 3,
    borderColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'transparent',
  },
  scanHint: {
    marginTop: SPACING.lg,
    color: COLORS.surface,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  permissionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  permissionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  permissionButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  lookupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
  },
  lookupBannerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  lookupBannerLabel: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  barcodeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  pickerButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  pickerOptions: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    maxHeight: 200,
  },
  pickerOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  pickerOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  pickerOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  rescanButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});

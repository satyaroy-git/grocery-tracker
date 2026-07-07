import React, { useState, useRef, useEffect } from 'react';
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
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_CATEGORIES, UNITS_OF_MEASUREMENT } from '../constants/categories';
import {
  createItem,
  getCustomCategories,
  addCustomCategory,
  getCustomUnits,
  addCustomUnit,
} from '../database';
import { lookupBarcode, BarcodeProductInfo } from '../services/barcodeLookup';
import DateField from '../components/DateField';
import SelectModal from '../components/SelectModal';
import { safeCategoryGuess, guessUnitFromName } from '../utils/itemClassifier';

type ScreenState = 'scanning' | 'looking-up' | 'review' | 'saving';

// Barcode formats commonly used on retail/grocery packaging in India and worldwide.
const SCAN_BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export default function BarcodeScanScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();

  const [screenState, setScreenState] = useState<ScreenState>('scanning');
  const [lookupResult, setLookupResult] = useState<BarcodeProductInfo | null>(null);
  const scannedOnceRef = useRef(false);

  // Editable form fields for the review step - pre-filled from lookup when available
  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [extraUnits, setExtraUnits] = useState<{ value: string; label: string }[]>([]);
  // Once the lookup sets a category/unit (found=true), or the user manually
  // picks one, auto-suggestion from typing stops overriding it.
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [unitTouched, setUnitTouched] = useState(false);
  const [unit, setUnit] = useState(UNITS_OF_MEASUREMENT[0].value);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [threshold, setThreshold] = useState('0');
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [cats, units] = await Promise.all([getCustomCategories(), getCustomUnits()]);
        setExtraCategories(cats);
        setExtraUnits(units);
      } catch (error) {
        console.error('Failed to load custom categories/units:', error);
      }
    })();
  }, []);

  const allCategoryOptions = [...DEFAULT_CATEGORIES, ...extraCategories].map((c) => ({
    label: c,
    value: c,
  }));
  const allUnitOptions = [...UNITS_OF_MEASUREMENT, ...extraUnits];

  const handleAddCustomCategory = async (value: string) => {
    await addCustomCategory(value);
    setExtraCategories((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setCategory(value);
    setCategoryTouched(true);
  };

  const handleAddCustomUnit = async (value: string) => {
    await addCustomUnit(value);
    setExtraUnits((prev) => (prev.some((u) => u.value === value) ? prev : [...prev, { value, label: value }]));
    setUnit(value);
    setUnitTouched(true);
  };

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
    if (!unitTouched) {
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
    if (price.trim() && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      Alert.alert('Error', 'Please enter a valid price, or leave it blank.');
      return;
    }

    setSaving(true);
    try {
      await createItem({
        name: name.trim(),
        category,
        unit,
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

  const selectedUnitLabel = allUnitOptions.find((u) => u.value === unit)?.label || unit;

  // --- Permission states ---
  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="barcode-outline" size={64} color={colors.textLight} />
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
        <ActivityIndicator size="large" color={colors.primary} />
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
              { backgroundColor: lookupResult.found ? colors.successBg : colors.warningBg },
            ]}
          >
            {lookupResult.imageUrl && (
              <Image source={{ uri: lookupResult.imageUrl }} style={styles.productImage} />
            )}
            <View style={styles.lookupBannerText}>
              <Ionicons
                name={lookupResult.found ? 'checkmark-circle' : 'information-circle'}
                size={18}
                color={lookupResult.found ? colors.success : colors.warning}
              />
              <Text
                style={[
                  styles.lookupBannerLabel,
                  { color: lookupResult.found ? colors.success : colors.warning },
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
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.pickerButtonText}>{category}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Unit */}
        <View style={styles.field}>
          <Text style={styles.label}>Unit of Measurement</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowUnitModal(true)}
          >
            <Text style={styles.pickerButtonText}>{selectedUnitLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <SelectModal
          visible={showCategoryModal}
          title="Select Category"
          options={allCategoryOptions}
          selectedValue={category}
          onSelect={(value) => {
            setCategory(value);
            setCategoryTouched(true);
          }}
          onClose={() => setShowCategoryModal(false)}
          onAddCustom={handleAddCustomCategory}
          addCustomLabel="+ Add New Category"
          addCustomPlaceholder="e.g. Floor Cleaner, Toothpaste"
        />

        <SelectModal
          visible={showUnitModal}
          title="Select Unit"
          options={allUnitOptions}
          selectedValue={unit}
          onSelect={(value) => {
            setUnit(value);
            setUnitTouched(true);
          }}
          onClose={() => setShowUnitModal(false)}
          onAddCustom={handleAddCustomUnit}
          addCustomLabel="+ Add New Unit"
          addCustomPlaceholder="e.g. crate, drum, number"
        />

        {/* Quantity */}
        <View style={styles.field}>
          <Text style={styles.label}>Current Quantity</Text>
          <TextInput
            style={styles.input}
            value={currentQuantity}
            onChangeText={setCurrentQuantity}
            placeholder="0"
            placeholderTextColor={colors.textLight}
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
            placeholderTextColor={colors.textLight}
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
            placeholderTextColor={colors.textLight}
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
          <Ionicons name="scan-outline" size={20} color={colors.primary} />
          <Text style={styles.rescanButtonText}>Scan a Different Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="checkmark" size={22} color={colors.surface} />
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Add to Pantry'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centeredContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
      backgroundColor: colors.background,
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
      borderColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: 'transparent',
    },
    scanHint: {
      marginTop: SPACING.lg,
      color: colors.surface,
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
      color: colors.textSecondary,
    },
    permissionTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: colors.text,
      marginTop: SPACING.md,
    },
    permissionText: {
      fontSize: FONT_SIZES.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: SPACING.sm,
      lineHeight: 22,
    },
    permissionButton: {
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
      ...SHADOWS.md,
    },
    permissionButtonText: {
      color: colors.surface,
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
      backgroundColor: colors.surface,
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
      color: colors.textSecondary,
      marginBottom: SPACING.md,
    },
    field: {
      marginBottom: SPACING.md,
    },
    label: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: SPACING.xs,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      fontSize: FONT_SIZES.lg,
      color: colors.text,
    },
    pickerButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerButtonText: {
      fontSize: FONT_SIZES.lg,
      color: colors.text,
    },
    pickerOptions: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md,
      marginTop: SPACING.xs,
      maxHeight: 200,
    },
    pickerOption: {
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerOptionSelected: {
      backgroundColor: colors.primaryLight + '20',
    },
    pickerOptionText: {
      fontSize: FONT_SIZES.md,
      color: colors.text,
    },
    pickerOptionTextSelected: {
      color: colors.primary,
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
      borderColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
    },
    rescanButtonText: {
      color: colors.primary,
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: colors.primary,
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
      color: colors.surface,
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
    },
  });

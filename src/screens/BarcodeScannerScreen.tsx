import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { lookupProductByBarcode, searchProductByName, ScannedProduct } from '../services/barcodeService';

export default function BarcodeScannerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showNameSearch, setShowNameSearch] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = async (barcode: string) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const result = await lookupProductByBarcode(barcode);

      if (result.success && result.product) {
        setScannedProduct(result.product);
        Alert.alert('Success', result.message || 'Product found!');
      } else {
        Alert.alert('Not Found', result.message || 'Product not found. Try searching by name.');
        setShowNameSearch(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to scan barcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualBarcodeSubmit = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }

    setLoading(true);
    try {
      const result = await lookupProductByBarcode(manualBarcode);

      if (result.success && result.product) {
        setScannedProduct(result.product);
        setShowManualEntry(false);
        Alert.alert('Success', result.message || 'Product found!');
      } else {
        Alert.alert('Not Found', result.message || 'Product not found. Try searching by name.');
        setShowNameSearch(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to lookup barcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSearch = async () => {
    if (!searchName.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    setLoading(true);
    try {
      const result = await searchProductByName(searchName);

      if (result.success && result.product) {
        setScannedProduct(result.product);
        setShowNameSearch(false);
        Alert.alert('Success', result.message || 'Product found!');
      } else {
        Alert.alert('Not Found', result.message || 'No products found with that name.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProduct = () => {
    if (scannedProduct) {
      navigation.navigate('AddItem', { scannedProduct });
    }
  };

  const handleReset = () => {
    setScannedProduct(null);
    setScanned(false);
    setManualBarcode('');
    setSearchName('');
    setShowManualEntry(false);
    setShowNameSearch(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required to scan barcodes</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show product details if scanned
  if (scannedProduct) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
            <Text style={styles.successTitle}>Product Found!</Text>
            <Text style={styles.successMessage}>{scannedProduct.message || 'Product details loaded'}</Text>
          </View>

          <View style={styles.productCard}>
            <View style={styles.productField}>
              <Text style={styles.productLabel}>Product Name</Text>
              <Text style={styles.productValue}>{scannedProduct.name}</Text>
            </View>

            <View style={styles.productField}>
              <Text style={styles.productLabel}>Barcode</Text>
              <Text style={styles.productValue}>{scannedProduct.barcode}</Text>
            </View>

            <View style={styles.productField}>
              <Text style={styles.productLabel}>Category</Text>
              <Text style={styles.productValue}>{scannedProduct.category}</Text>
            </View>

            <View style={styles.productField}>
              <Text style={styles.productLabel}>Unit</Text>
              <Text style={styles.productValue}>{scannedProduct.unit}</Text>
            </View>

            {scannedProduct.brand && (
              <View style={styles.productField}>
                <Text style={styles.productLabel}>Brand</Text>
                <Text style={styles.productValue}>{scannedProduct.brand}</Text>
              </View>
            )}
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmProduct}>
              <Ionicons name="checkmark" size={20} color={COLORS.surface} />
              <Text style={styles.confirmButtonText}>Use This Product</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.resetButtonText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Show name search if product not found
  if (showNameSearch) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.notFoundCard}>
            <Ionicons name="search" size={60} color={COLORS.warning} />
            <Text style={styles.notFoundTitle}>Product Not Found</Text>
            <Text style={styles.notFoundMessage}>Try searching by product name</Text>
          </View>

          <View style={styles.searchField}>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={searchName}
              onChangeText={setSearchName}
              placeholder="e.g. Rice, Milk, Eggs"
              placeholderTextColor={COLORS.textLight}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.searchButton, loading && styles.buttonDisabled]}
            onPress={handleNameSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <Ionicons name="search" size={20} color={COLORS.surface} />
                <Text style={styles.searchButtonText}>Search</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleReset}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={styles.backButtonText}>Back to Scanner</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Show manual entry if enabled
  if (showManualEntry) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.manualCard}>
            <Ionicons name="barcode" size={60} color={COLORS.primary} />
            <Text style={styles.manualTitle}>Enter Barcode Manually</Text>
            <Text style={styles.manualMessage}>Type the barcode number</Text>
          </View>

          <View style={styles.searchField}>
            <Text style={styles.label}>Barcode</Text>
            <TextInput
              style={styles.input}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="e.g. 8901030100220"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleManualBarcodeSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={COLORS.surface} />
                <Text style={styles.submitButtonText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => setShowManualEntry(false)}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={styles.backButtonText}>Back to Scanner</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Camera scanner view
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={({ data }) => handleBarcodeScanned(data)}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.scannerText}>Align barcode within frame</Text>
        </View>
      </CameraView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowManualEntry(true)}
        >
          <Ionicons name="keypad" size={24} color={COLORS.primary} />
          <Text style={styles.controlButtonText}>Manual Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={COLORS.primary} />
          <Text style={styles.controlButtonText}>Cancel</Text>
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
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
  },
  topLeft: {
    top: -5,
    left: -5,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: -5,
    right: -5,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: -5,
    left: -5,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: -5,
    right: -5,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scannerText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  controlButton: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  controlButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  successCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  successTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  successMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  notFoundCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  notFoundTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  notFoundMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  manualCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  manualTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  manualMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  productField: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  productLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  productValue: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    fontWeight: '500',
  },
  searchField: {
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
  buttonGroup: {
    gap: SPACING.md,
  },
  confirmButton: {
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  confirmButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  resetButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  searchButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  submitButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
});

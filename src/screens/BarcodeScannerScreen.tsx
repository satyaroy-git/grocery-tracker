import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { lookupProductByBarcode, searchProductByName, isValidBarcode } from '../services/barcodeService';
import { ScannedProduct } from '../services/barcodeService';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.8;

type BarcodeScannerRouteProp = RouteProp<any, 'BarcodeScanner'>;

export default function BarcodeScannerScreen() {
  const navigation = useNavigation();
  const route = useRoute<BarcodeScannerRouteProp>();
  const { onProductScanned } = route.params || {};

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarcodeScan = async (barcode: string) => {
    if (!isValidBarcode(barcode)) {
      Alert.alert('Invalid Barcode', 'Barcode format is not recognized. Please try again.');
      setScanned(false);
      return;
    }

    if (lastScannedBarcode === barcode) {
      return;
    }

    setLastScannedBarcode(barcode);
    setLoading(true);

    try {
      const result = await lookupProductByBarcode(barcode);

      if (result.success && result.product) {
        handleProductFound(result.product);
      } else {
        Alert.alert(
          'Product Not Found',
          `No product found for barcode: ${barcode}\n\nWould you like to add it manually?`,
          [
            { text: 'Cancel', onPress: () => setScanned(false) },
            {
              text: 'Add Manually',
              onPress: () => {
                setScanned(false);
                setShowManualInput(true);
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to lookup product. Please try again.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleProductFound = (product: ScannedProduct) => {
    if (onProductScanned) {
      onProductScanned(product);
    }
    navigation.goBack();
  };

  const handleManualSearch = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode or product name.');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isValidBarcode(manualBarcode)) {
        result = await lookupProductByBarcode(manualBarcode);
      } else {
        result = await searchProductByName(manualBarcode);
      }

      if (result.success && result.product) {
        handleProductFound(result.product);
      } else {
        Alert.alert('Not Found', result.message || 'Product not found in database.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off-outline" size={64} color={COLORS.error} />
          <Text style={styles.permissionTitle}>Camera Permission Denied</Text>
          <Text style={styles.permissionText}>
            Please enable camera access in your device settings to use the barcode scanner.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.surface} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showManualInput) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.manualInputContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowManualInput(false);
              setManualBarcode('');
            }}
          >
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.manualTitle}>Search Product</Text>
          <Text style={styles.manualSubtitle}>
            Enter barcode or product name
          </Text>

          <TextInput
            style={styles.manualInput}
            placeholder="Barcode or product name"
            placeholderTextColor={COLORS.textLight}
            value={manualBarcode}
            onChangeText={setManualBarcode}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.searchButton, loading && styles.buttonDisabled]}
            onPress={handleManualSearch}
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

          <TouchableOpacity
            style={styles.backToScanButton}
            onPress={() => {
              setShowManualInput(false);
              setManualBarcode('');
              setScanned(false);
            }}
          >
            <Text style={styles.backToScanButtonText}>Back to Scanner</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Barcode</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : ({ data }) => {
            setScanned(true);
            handleBarcodeScan(data);
          }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Looking up product...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {scanned ? 'Processing...' : 'Point camera at barcode'}
        </Text>

        {scanned && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setScanned(false);
              setLastScannedBarcode('');
            }}
          >
            <Ionicons name="refresh" size={20} color={COLORS.surface} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => setShowManualInput(true)}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          <Text style={styles.manualButtonText}>Manual Entry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.text,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  footerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  retryButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  manualButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  manualButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  permissionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    minWidth: 150,
  },
  backButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  manualInputContainer: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  manualTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  manualSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  manualInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: SPACING.lg,
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
  },
  searchButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  backToScanButton: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  backToScanButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

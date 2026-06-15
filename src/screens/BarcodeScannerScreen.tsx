import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { lookupBarcode, ProductInfo } from '../utils/barcodeLookup';
import { createItem } from '../database';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';

type ScanState = 'scanning' | 'loading' | 'found' | 'not_found';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH * 0.7;

export default function BarcodeScannerScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanState !== 'scanning') return;

      setScannedBarcode(data);
      setScanState('loading');

      try {
        const result = await lookupBarcode(data);
        if (result) {
          setProduct(result);
          setScanState('found');
        } else {
          setScanState('not_found');
        }
      } catch (error) {
        console.error('Barcode lookup error:', error);
        setScanState('not_found');
      }
    },
    [scanState]
  );

  const handleAddToPantry = async () => {
    if (!product) return;

    setIsAdding(true);
    try {
      await createItem({
        name: product.name,
        category: product.category,
        unit: product.unit || 'pieces',
        currentQuantity: parseFloat(product.quantity) || 1,
        threshold: 1,
        consumptionMode: 'manual',
      });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to add item:', error);
      setIsAdding(false);
    }
  };

  const handleScanAgain = () => {
    setProduct(null);
    setScannedBarcode('');
    setScanState('scanning');
  };

  const handleAddManually = () => {
    navigation.goBack();
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="camera-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need access to your camera to scan barcodes on grocery products.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanState === 'scanning' ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top section */}
        <View style={styles.overlayTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={COLORS.surface} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Scan Barcode</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Frame area */}
        <View style={styles.frameContainer}>
          <View style={styles.frame}>
            {/* Corner decorations */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          {scanState === 'scanning' && (
            <Text style={styles.instructionText}>
              Position the barcode within the frame
            </Text>
          )}
        </View>

        {/* Bottom section - Results card */}
        <View style={styles.overlayBottom}>
          {scanState === 'loading' && (
            <View style={styles.resultCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Looking up product...</Text>
            </View>
          )}

          {scanState === 'found' && product && (
            <View style={styles.resultCard}>
              <View style={styles.productHeader}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                <Text style={styles.productFoundLabel}>Product Found</Text>
              </View>

              <Text style={styles.productName}>{product.name}</Text>
              {product.brand ? (
                <Text style={styles.productBrand}>{product.brand}</Text>
              ) : null}

              <View style={styles.productDetails}>
                <View style={styles.detailChip}>
                  <Ionicons name="pricetag-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.detailChipText}>{product.category}</Text>
                </View>
                <View style={styles.detailChip}>
                  <Ionicons name="cube-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.detailChipText}>
                    {product.quantity} {product.unit}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddToPantry}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color={COLORS.surface} />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color={COLORS.surface} />
                    <Text style={styles.addButtonText}>Add to Pantry</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAgain}>
                <Text style={styles.scanAgainText}>Scan Another</Text>
              </TouchableOpacity>
            </View>
          )}

          {scanState === 'not_found' && (
            <View style={styles.resultCard}>
              <View style={styles.productHeader}>
                <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
                <Text style={styles.notFoundLabel}>Not Found</Text>
              </View>

              <Text style={styles.notFoundText}>
                Product not found in database
              </Text>
              <Text style={styles.barcodeText}>Barcode: {scannedBarcode}</Text>

              <TouchableOpacity style={styles.addButton} onPress={handleAddManually}>
                <Ionicons name="create-outline" size={20} color={COLORS.surface} />
                <Text style={styles.addButtonText}>Add Manually</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAgain}>
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  overlayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xxl + SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.surface,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  frameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE * 0.6,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: BORDER_RADIUS.sm,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: BORDER_RADIUS.sm,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: BORDER_RADIUS.sm,
  },
  instructionText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.surface,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlayBottom: {
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.md,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  productFoundLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: SPACING.sm,
  },
  notFoundLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.warning,
    marginLeft: SPACING.sm,
  },
  productName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  productBrand: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  productDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  detailChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  addButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.surface,
  },
  scanAgainButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  scanAgainText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  notFoundText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  barcodeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  permissionTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  permissionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  permissionButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.surface,
  },
  cancelButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});

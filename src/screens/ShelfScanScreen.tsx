import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  FlatList,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { getApiKey } from '../services/config';
import { createItemsBatch, CreateItemInput } from '../database';
import { safeCategoryGuess, guessUnitFromName } from '../utils/itemClassifier';

interface RecognizedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  selected: boolean;
}

export default function ShelfScanScreen() {
  const { colors } = useTheme();
  const { language } = useTranslation();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<RecognizedItem[]>([]);
  const [saving, setSaving] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Camera permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setItems([]);
        analyzeImage(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const analyzeImage = async (uri: string) => {
    setAnalyzing(true);
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('Gemini API key not configured.');
      }

      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const prompt = `Analyze this image of a kitchen shelf/pantry/refrigerator. Identify ALL grocery items visible in the image.

For each item, provide:
1. Name (proper product name in English)
2. Estimated quantity (number)
3. Unit (kg, L, mL, g, nos, pkt, etc.)

Rules:
- Only include items you can clearly identify
- Estimate quantities based on container size and fullness
- Group identical items (e.g. "3 packets of Maggi" not three separate entries)
- Include brand names if clearly visible (e.g. "Tata Salt" not just "Salt")
- If you can't determine quantity, estimate based on typical package sizes

Respond ONLY with valid JSON (no markdown):
{
  "items": [
    {"name": "Item Name", "quantity": 1, "unit": "kg"},
    {"name": "Item Name", "quantity": 2, "unit": "L"}
  ]
}`;

      const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

      for (const model of models) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64,
                    },
                  },
                ],
              }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
            }),
          }
        );

        if (response.status === 429 || response.status === 503) continue;

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        try {
          const parsed = JSON.parse(cleaned);
          if (parsed.items && Array.isArray(parsed.items)) {
            const recognized: RecognizedItem[] = parsed.items.map((item: any) => ({
              name: item.name || 'Unknown',
              quantity: item.quantity || 1,
              unit: item.unit || guessUnitFromName(item.name || '', item.quantity || 1),
              category: safeCategoryGuess(item.name || ''),
              selected: true,
            }));
            setItems(recognized);
            return;
          }
        } catch {
          throw new Error('Failed to parse AI response. Try with a clearer photo.');
        }
      }

      throw new Error('AI service unavailable. Please try again.');
    } catch (error: any) {
      Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleItem = (idx: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSave = async () => {
    const selectedItems = items.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'कृपया कम से कम एक आइटम चुनें' : 'Please select at least one item'
      );
      return;
    }

    setSaving(true);
    try {
      const inputs: CreateItemInput[] = selectedItems.map((item) => ({
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentQuantity: item.quantity,
        threshold: Math.max(1, Math.round(item.quantity * 0.2)),
        consumptionMode: 'manual' as const,
        autoConsumptionRate: null,
        autoConsumptionFrequency: null,
        price: null,
        expiryDate: null,
      }));

      await createItemsBatch(inputs);

      Alert.alert(
        language === 'hi' ? 'सफल' : 'Success',
        language === 'hi'
          ? `${selectedItems.length} आइटम पैंट्री में जोड़े गए`
          : `Added ${selectedItems.length} items to your pantry`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── No image yet ───────────────────────────────────────────────────────
  if (!imageUri) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.cameraCircle}>
            <Ionicons name="camera" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {language === 'hi' ? 'शेल्फ स्कैन करें' : 'Scan Your Shelf'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {language === 'hi'
              ? 'अपनी पैंट्री/फ्रिज की फोटो लें और AI सभी आइटम पहचान लेगा'
              : 'Take a photo of your pantry/fridge and AI will identify all items'}
          </Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => pickImage(true)}>
              <Ionicons name="camera" size={22} color={colors.surface} />
              <Text style={styles.primaryButtonText}>
                {language === 'hi' ? 'कैमरा खोलें' : 'Take Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(false)}>
              <Ionicons name="image-outline" size={22} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>
                {language === 'hi' ? 'गैलरी से चुनें' : 'Pick from Gallery'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── Analyzing ──────────────────────────────────────────────────────────
  if (analyzing) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
        <View style={styles.analyzingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.analyzingText}>
            {language === 'hi'
              ? 'AI आइटम पहचान रहा है...'
              : 'AI is identifying items...'}
          </Text>
        </View>
      </View>
    );
  }

  // ─── Results ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.previewImageSmall} />

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {language === 'hi'
            ? `${items.length} आइटम पहचाने गए`
            : `${items.length} items recognized`}
        </Text>
        <TouchableOpacity onPress={() => { setImageUri(null); setItems([]); }}>
          <Text style={styles.retakeText}>
            {language === 'hi' ? 'दोबारा लें' : 'Retake'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, idx) => idx.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.itemRow} onPress={() => toggleItem(index)}>
            <Ionicons
              name={item.selected ? 'checkbox' : 'square-outline'}
              size={24}
              color={item.selected ? colors.primary : colors.textLight}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDetail}>
                {item.quantity} {item.unit} • {item.category}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
              <Text style={styles.saveButtonText}>
                {language === 'hi'
                  ? `${items.filter((i) => i.selected).length} आइटम जोड़ें`
                  : `Add ${items.filter((i) => i.selected).length} Items to Pantry`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    cameraCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryLight + '20', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
    emptyTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: colors.text },
    emptySubtitle: { fontSize: FONT_SIZES.md, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.xl },
    buttonGroup: { width: '100%', gap: SPACING.md },
    primaryButton: { backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, ...SHADOWS.md },
    primaryButtonText: { color: colors.surface, fontSize: FONT_SIZES.lg, fontWeight: '700' },
    secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
    secondaryButtonText: { color: colors.primary, fontSize: FONT_SIZES.lg, fontWeight: '700' },
    previewImage: { width: '100%', height: '60%', resizeMode: 'cover' },
    previewImageSmall: { width: '100%', height: 150, resizeMode: 'cover' },
    analyzingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    analyzingText: { fontSize: FONT_SIZES.lg, color: colors.textSecondary, marginTop: SPACING.md, textAlign: 'center' },
    resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    resultsTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: colors.text },
    retakeText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.primary },
    listContent: { padding: SPACING.md, paddingBottom: 100 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    itemInfo: { flex: 1 },
    itemName: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: colors.text },
    itemDetail: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, marginTop: 2 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, ...SHADOWS.lg },
    saveButton: { backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
    saveButtonText: { color: colors.surface, fontSize: FONT_SIZES.lg, fontWeight: '700' },
    buttonDisabled: { opacity: 0.6 },
  });

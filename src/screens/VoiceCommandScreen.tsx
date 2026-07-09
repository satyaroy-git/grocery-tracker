import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { parseVoiceCommand, executeCommand, ParsedCommand, ActionType } from '../services/voiceCommands';

const ACTION_ICONS: Record<ActionType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  add_item: { icon: 'add-circle', color: '#4CAF50' },
  log_usage: { icon: 'remove-circle', color: '#F44336' },
  add_to_shopping: { icon: 'cart', color: '#FF9800' },
  restock: { icon: 'refresh-circle', color: '#2196F3' },
  recipe: { icon: 'restaurant', color: '#9C27B0' },
  unknown: { icon: 'help-circle', color: '#9E9E9E' },
};

const ACTION_LABELS: Record<ActionType, { en: string; hi: string }> = {
  add_item: { en: 'Add to Pantry', hi: 'पैंट्री में जोड़ें' },
  log_usage: { en: 'Log Usage', hi: 'उपयोग दर्ज करें' },
  add_to_shopping: { en: 'Add to Shopping List', hi: 'खरीदारी सूची में जोड़ें' },
  restock: { en: 'Restock Item', hi: 'रीस्टॉक करें' },
  recipe: { en: 'Get Recipe Suggestions', hi: 'रेसिपी सुझाव पाएं' },
  unknown: { en: 'Unknown', hi: 'अज्ञात' },
};

const EXAMPLE_COMMANDS = [
  { en: 'Add 2 kg rice', hi: '2 kg चावल जोड़ें' },
  { en: 'I used 500ml milk', hi: '500ml दूध इस्तेमाल किया' },
  { en: 'Buy eggs from store', hi: 'दुकान से अंडे खरीदें' },
  { en: 'Restock 1L cooking oil', hi: '1L तेल रीस्टॉक करें' },
  { en: 'What should I cook?', hi: 'आज क्या बनाऊं?' },
];

export default function VoiceCommandScreen() {
  const { colors } = useTheme();
  const { language } = useTranslation();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const inputRef = useRef<TextInput>(null);

  const [command, setCommand] = useState('');
  const [parsing, setParsing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleParse = async () => {
    if (!command.trim()) {
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'कृपया एक कमांड टाइप या बोलें' : 'Please type or speak a command'
      );
      return;
    }

    setParsing(true);
    setParsedCommand(null);
    setResult(null);
    try {
      const parsed = await parseVoiceCommand(command);
      setParsedCommand(parsed);
    } catch (err: any) {
      Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleExecute = async () => {
    if (!parsedCommand) return;

    // Recipe action: navigate directly to recipe suggestions
    if (parsedCommand.action === 'recipe') {
      navigation.goBack();
      // Navigate to Insights tab → RecipeSuggestions
      // Since we're in InventoryStack, we need to navigate to the tab first
      (navigation as any).navigate('DashboardTab', { screen: 'RecipeSuggestions' });
      return;
    }

    setExecuting(true);
    try {
      const msg = await executeCommand(parsedCommand);
      setResult(msg);
      // Clear state after success
      setTimeout(() => {
        setCommand('');
        setParsedCommand(null);
        setResult(null);
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', err.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleExampleTap = (text: string) => {
    setCommand(text);
    setParsedCommand(null);
    setResult(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={40} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>
            {language === 'hi' ? 'वॉइस कमांड' : 'Voice Command'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {language === 'hi'
              ? 'टाइप करें या कीबोर्ड माइक से बोलें'
              : 'Type or use keyboard mic to speak'}
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <Ionicons name="mic-outline" size={22} color={colors.primary} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={command}
              onChangeText={(text) => {
                setCommand(text);
                setParsedCommand(null);
                setResult(null);
              }}
              placeholder={language === 'hi' ? 'कमांड टाइप करें...' : 'Type your command...'}
              placeholderTextColor={colors.textLight}
              multiline
              autoFocus
              onSubmitEditing={handleParse}
              blurOnSubmit={false}
            />
            {command.length > 0 && (
              <TouchableOpacity onPress={() => { setCommand(''); setParsedCommand(null); setResult(null); }}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.parseButton, parsing && styles.buttonDisabled]}
            onPress={handleParse}
            disabled={parsing || !command.trim()}
          >
            {parsing ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.surface} />
                <Text style={styles.parseButtonText}>
                  {language === 'hi' ? 'AI से समझें' : 'Parse with AI'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Parsed Result */}
        {parsedCommand && !result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={ACTION_ICONS[parsedCommand.action].icon}
                size={28}
                color={ACTION_ICONS[parsedCommand.action].color}
              />
              <View style={styles.resultHeaderText}>
                <Text style={styles.resultAction}>
                  {language === 'hi'
                    ? ACTION_LABELS[parsedCommand.action].hi
                    : ACTION_LABELS[parsedCommand.action].en}
                </Text>
                <Text style={styles.resultSummary}>
                  {language === 'hi' ? parsedCommand.summaryHi : parsedCommand.summary}
                </Text>
              </View>
            </View>

            <View style={styles.resultDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {language === 'hi' ? 'आइटम' : 'Item'}
                </Text>
                <Text style={styles.detailValue}>{parsedCommand.itemName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {language === 'hi' ? 'मात्रा' : 'Quantity'}
                </Text>
                <Text style={styles.detailValue}>{parsedCommand.quantity} {parsedCommand.unit}</Text>
              </View>
              {parsedCommand.price && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'hi' ? 'कीमत' : 'Price'}
                  </Text>
                  <Text style={styles.detailValue}>₹{parsedCommand.price}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.executeButton, executing && styles.buttonDisabled]}
              onPress={handleExecute}
              disabled={executing}
            >
              {executing ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
                  <Text style={styles.executeButtonText}>
                    {language === 'hi' ? 'पुष्टि करें' : 'Confirm & Execute'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Success Result */}
        {result && (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.successText}>{result}</Text>
          </View>
        )}

        {/* Examples */}
        {!parsedCommand && !result && (
          <View style={styles.examplesSection}>
            <Text style={styles.examplesTitle}>
              {language === 'hi' ? 'उदाहरण कमांड:' : 'Example commands:'}
            </Text>
            {EXAMPLE_COMMANDS.map((ex, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.exampleChip}
                onPress={() => handleExampleTap(language === 'hi' ? ex.hi : ex.en)}
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                <Text style={styles.exampleText}>
                  {language === 'hi' ? ex.hi : ex.en}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.tipText}>
              {language === 'hi'
                ? '💡 टिप: कीबोर्ड पर माइक बटन दबाकर बोल सकते हैं'
                : '💡 Tip: Tap the mic button on your keyboard to speak'}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
    headerCard: { alignItems: 'center', paddingVertical: SPACING.lg, marginBottom: SPACING.lg },
    micCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLight + '20', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
    headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: colors.text },
    headerSubtitle: { fontSize: FONT_SIZES.md, color: colors.textSecondary, marginTop: SPACING.xs },
    inputSection: { marginBottom: SPACING.lg },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
    input: { flex: 1, fontSize: FONT_SIZES.lg, color: colors.text, minHeight: 50, textAlignVertical: 'top' },
    parseButton: { backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginTop: SPACING.sm, ...SHADOWS.md },
    parseButtonText: { color: colors.surface, fontSize: FONT_SIZES.md, fontWeight: '700' },
    buttonDisabled: { opacity: 0.6 },
    resultCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm, borderWidth: 1, borderColor: colors.primary + '30' },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
    resultHeaderText: { flex: 1 },
    resultAction: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
    resultSummary: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: colors.text, marginTop: 2 },
    resultDetails: { backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
    detailLabel: { fontSize: FONT_SIZES.md, color: colors.textSecondary },
    detailValue: { fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.text },
    executeButton: { backgroundColor: colors.success, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, ...SHADOWS.md },
    executeButtonText: { color: colors.surface, fontSize: FONT_SIZES.lg, fontWeight: '700' },
    successCard: { backgroundColor: colors.successBg, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.md },
    successText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: colors.success, marginTop: SPACING.sm, textAlign: 'center' },
    examplesSection: { marginTop: SPACING.md },
    examplesTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.text, marginBottom: SPACING.sm },
    exampleChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: colors.border },
    exampleText: { fontSize: FONT_SIZES.md, color: colors.text },
    tipText: { fontSize: FONT_SIZES.sm, color: colors.textLight, textAlign: 'center', marginTop: SPACING.lg, lineHeight: 20 },
  });

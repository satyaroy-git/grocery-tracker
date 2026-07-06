import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectModalProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  // When provided, shows an "Add new..." row that opens an inline text
  // input. Submitting calls onAddCustom(text) - the caller is responsible
  // for persisting it (e.g. to the database) and adding it to `options`
  // going forward.
  onAddCustom?: (value: string) => void;
  addCustomLabel?: string;
  addCustomPlaceholder?: string;
}

/**
 * A real, guaranteed-scrollable picker using RN's Modal + FlatList.
 *
 * Replaces the previous inline dropdown pattern (a plain View or a ScrollView
 * nested inside the screen's own ScrollView, both capped at a fixed
 * maxHeight). That pattern silently hid every option past the visible
 * height on some platforms/gesture configurations - with 35+ categories or
 * units, most of the list was effectively unreachable. FlatList inside a
 * full-screen Modal always scrolls correctly regardless of what's on the
 * screen behind it.
 */
export default function SelectModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  onAddCustom,
  addCustomLabel = '+ Add New',
  addCustomPlaceholder = 'Type a new option...',
}: SelectModalProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [customText, setCustomText] = useState('');

  const handleClose = () => {
    setShowAddInput(false);
    setCustomText('');
    onClose();
  };

  const handleSubmitCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed || !onAddCustom) return;
    onAddCustom(trimmed);
    setCustomText('');
    setShowAddInput(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            style={styles.list}
            showsVerticalScrollIndicator={true}
            initialNumToRender={30}
            renderItem={({ item }) => {
              const isSelected = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    handleClose();
                  }}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              onAddCustom ? (
                <View style={styles.addSection}>
                  {!showAddInput ? (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => setShowAddInput(true)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.addButtonText}>{addCustomLabel}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.addInputRow}>
                      <TextInput
                        style={styles.addInput}
                        value={customText}
                        onChangeText={setCustomText}
                        placeholder={addCustomPlaceholder}
                        placeholderTextColor={COLORS.textLight}
                        autoFocus
                        onSubmitEditing={handleSubmitCustom}
                      />
                      <TouchableOpacity
                        style={styles.addConfirmButton}
                        onPress={handleSubmitCustom}
                        disabled={!customText.trim()}
                      >
                        <Ionicons name="checkmark" size={20} color={COLORS.surface} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : null
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '75%',
    minHeight: '40%',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  list: {
    paddingHorizontal: SPACING.md,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  optionSelected: {
    backgroundColor: COLORS.primaryLight + '15',
  },
  optionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  addSection: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  addInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  addConfirmButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

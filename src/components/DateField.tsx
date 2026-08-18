import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SPACING, FONT_SIZES, BORDER_RADIUS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface DateFieldProps {
  label: string;
  value: string | null; // ISO date string 'YYYY-MM-DD', or null when unset
  onChange: (isoDate: string | null) => void;
  placeholder?: string;
  minimumDate?: Date;
}

/**
 * Shared optional date-picker field used for "Expiry Date" across
 * AddItemScreen, EditItemScreen, ScanInvoiceScreen review, and
 * BarcodeScanScreen review - keeps the expiry date UX consistent
 * everywhere an item can be created/edited.
 */
export default function DateField({ label, value, onChange, placeholder, minimumDate }: DateFieldProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [showPicker, setShowPicker] = useState(false);

  const dateValue = value ? new Date(value) : new Date();

  const formatDisplay = (isoDate: string): string => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const toIsoDateOnly = (date: Date): string => {
    // Avoid timezone shifting issues - build the ISO date string from local
    // year/month/day rather than using toISOString() (which converts to UTC
    // and can roll the date backward/forward by a day near midnight).
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android's picker is a modal dialog - always closes itself after one action
      setShowPicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      onChange(toIsoDateOnly(selectedDate));
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setShowPicker(true)}>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.pickerButtonText, !value && styles.placeholderText]}>
          {value ? formatDisplay(value) : placeholder || 'Not set (optional)'}
        </Text>
        {value && (
          <TouchableOpacity onPress={() => onChange(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity style={styles.doneButton} onPress={() => setShowPicker(false)}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    field: {
      marginBottom: SPACING.md,
    },
    label: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: SPACING.xs,
    },
    pickerButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    pickerButtonText: {
      flex: 1,
      fontSize: FONT_SIZES.lg,
      color: colors.text,
    },
    placeholderText: {
      color: colors.textLight,
    },
    doneButton: {
      alignSelf: 'flex-end',
      padding: SPACING.sm,
    },
    doneButtonText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: FONT_SIZES.md,
    },
  });

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import {
  ShoppingTemplate,
  getAllTemplates,
  createTemplateFromCurrentShoppingList,
  deleteTemplate,
  markTemplateUsed,
  addToShoppingList,
} from '../database';

export default function ShoppingTemplatesScreen() {
  const navigation = useNavigation();
  const [templates, setTemplates] = useState<ShoppingTemplate[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const loadTemplates = useCallback(async () => {
    try {
      setTemplates(await getAllTemplates());
    } catch (e) { console.error(e); }
  }, []);

  useFocusEffect(useCallback(() => { loadTemplates(); }, [loadTemplates]));

  const handleSaveCurrentList = async () => {
    const name = newName.trim() || 'My Template';
    try {
      const template = await createTemplateFromCurrentShoppingList();
      if (!template) {
        Alert.alert('Empty List', 'Your shopping list is empty. Add items first.');
        return;
      }
      // Rename it
      const { updateTemplate } = require('../database');
      await updateTemplate(template.id, name, template.items);
      setShowCreate(false);
      setNewName('');
      await loadTemplates();
      Alert.alert('Saved!', `Template "${name}" saved with ${template.items.length} items.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save template.');
    }
  };

  const handleUseTemplate = (template: ShoppingTemplate) => {
    Alert.alert(
      'Use Template',
      `Add ${template.items.length} items from "${template.name}" to your shopping list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to List',
          onPress: async () => {
            try {
              for (const item of template.items) {
                await addToShoppingList(item.name, item.category, item.unit, item.quantity);
              }
              await markTemplateUsed(template.id);
              Alert.alert('Done!', `${template.items.length} items added to your shopping list.`);
              await loadTemplates();
            } catch (e) {
              Alert.alert('Error', 'Failed to add items.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteTemplate = (template: ShoppingTemplate) => {
    Alert.alert('Delete Template', `Delete "${template.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTemplate(template.id); await loadTemplates(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Shopping Templates</Text>
        <Text style={styles.subtitle}>Save your frequent orders and reuse them with one tap</Text>
      </View>

      {/* Save current list */}
      {!showCreate ? (
        <TouchableOpacity style={styles.saveButton} onPress={() => setShowCreate(true)}>
          <Ionicons name="bookmark-outline" size={18} color={COLORS.primary} />
          <Text style={styles.saveButtonText}>Save Current Shopping List as Template</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.createCard}>
          <TextInput
            style={styles.nameInput}
            placeholder="Template name (e.g., Weekly Basics)"
            placeholderTextColor={COLORS.textLight}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <View style={styles.createActions}>
            <TouchableOpacity onPress={() => { setShowCreate(false); setNewName(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveCurrentList}>
              <Text style={styles.confirmBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Templates list */}
      <FlatList
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No templates yet</Text>
            <Text style={styles.emptySubtext}>Add items to your shopping list, then save it as a template for quick reuse.</Text>
          </View>
        }
        renderItem={({ item: template }) => (
          <View style={styles.templateCard}>
            <TouchableOpacity style={styles.templateContent} onPress={() => handleUseTemplate(template)}>
              <View style={styles.templateHeader}>
                <Ionicons name="bookmark" size={20} color={COLORS.primary} />
                <Text style={styles.templateName}>{template.name}</Text>
              </View>
              <Text style={styles.templateItems}>
                {template.items.slice(0, 4).map((i) => i.name).join(', ')}
                {template.items.length > 4 ? ` +${template.items.length - 4} more` : ''}
              </Text>
              <View style={styles.templateMeta}>
                <Text style={styles.templateCount}>{template.items.length} items</Text>
                {template.lastUsed && (
                  <Text style={styles.templateLastUsed}>Last used: {new Date(template.lastUsed).toLocaleDateString()}</Text>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.templateActions}>
              <TouchableOpacity style={styles.useBtn} onPress={() => handleUseTemplate(template)}>
                <Ionicons name="cart-outline" size={16} color="#fff" />
                <Text style={styles.useBtnText}>Use</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteTemplate(template)}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.md },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  saveButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', gap: SPACING.sm, marginBottom: SPACING.md },
  saveButtonText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '500' },
  createCard: { backgroundColor: COLORS.surface, marginHorizontal: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  nameInput: { backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONT_SIZES.md, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: SPACING.sm, gap: SPACING.md },
  cancelText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  confirmBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  confirmBtnText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md },
  emptySubtext: { fontSize: FONT_SIZES.md, color: COLORS.textLight, textAlign: 'center', marginTop: SPACING.xs, paddingHorizontal: SPACING.xl },
  templateCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  templateContent: { marginBottom: SPACING.sm },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  templateName: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  templateItems: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, marginLeft: SPACING.xl + SPACING.sm },
  templateMeta: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs, marginLeft: SPACING.xl + SPACING.sm },
  templateCount: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600' },
  templateLastUsed: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
  templateActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  useBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.full, gap: 4 },
  useBtnText: { color: '#fff', fontSize: FONT_SIZES.sm, fontWeight: '600' },
});

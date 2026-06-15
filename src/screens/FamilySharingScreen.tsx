import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Share, FlatList, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import {
  createFamily, joinFamily, getFamilyMembers, getSharedShoppingList,
  addToSharedList, toggleSharedItemPurchased, removeFromSharedList,
  syncPantryToCloud, getDeviceId, setDeviceId,
  subscribeToShoppingList, unsubscribeFromChannel,
} from '../utils/supabase';
import { getAllItems } from '../database';

type ViewMode = 'setup' | 'family';

interface FamilyState {
  familyId: string;
  familyCode: string;
  displayName: string;
}

const STORAGE_KEY = '@grocery_tracker_family';
const DEVICE_ID_KEY = '@grocery_tracker_device_id';

export default function FamilySharingScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [familyState, setFamilyState] = useState<FamilyState | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup state
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Family state
  const [members, setMembers] = useState<{ deviceId: string; displayName: string; joinedAt: string }[]>([]);
  const [sharedList, setSharedList] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSavedState();
  }, []);

  useFocusEffect(useCallback(() => {
    if (familyState) loadFamilyData();
  }, [familyState]));

  // Realtime subscription
  useEffect(() => {
    let channel: any = null;
    if (familyState) {
      channel = subscribeToShoppingList(familyState.familyId, () => {
        loadSharedList();
      });
    }
    return () => { if (channel) unsubscribeFromChannel(channel); };
  }, [familyState]);

  async function loadSavedState() {
    try {
      // Load or create device ID
      const savedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (savedDeviceId) {
        setDeviceId(savedDeviceId);
      } else {
        const newId = getDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
      }

      // Load family state
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FamilyState;
        setFamilyState(parsed);
        setViewMode('family');
      }
    } catch (e) { }
    finally { setLoading(false); }
  }

  async function saveFamilyState(state: FamilyState) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setFamilyState(state);
    setViewMode('family');
  }

  async function loadFamilyData() {
    if (!familyState) return;
    const [memberData, listData] = await Promise.all([
      getFamilyMembers(familyState.familyId),
      getSharedShoppingList(familyState.familyId),
    ]);
    setMembers(memberData);
    setSharedList(listData);
  }

  async function loadSharedList() {
    if (!familyState) return;
    const listData = await getSharedShoppingList(familyState.familyId);
    setSharedList(listData);
  }

  // ============ SETUP HANDLERS ============

  const handleCreateFamily = async () => {
    if (!displayName.trim()) { Alert.alert('Error', 'Please enter your name'); return; }
    setCreating(true);
    try {
      const result = await createFamily(displayName.trim());
      if (result) {
        await saveFamilyState({ familyId: result.familyId, familyCode: result.familyCode, displayName: displayName.trim() });
        Alert.alert('Family Created!', `Your family code is: ${result.familyCode}\n\nShare this code with family members so they can join.`);
      } else {
        Alert.alert('Error', 'Failed to create family. Check your internet connection.');
      }
    } catch (e) { Alert.alert('Error', 'Something went wrong.'); }
    finally { setCreating(false); }
  };

  const handleJoinFamily = async () => {
    if (!displayName.trim()) { Alert.alert('Error', 'Please enter your name'); return; }
    if (!joinCode.trim() || joinCode.trim().length !== 6) { Alert.alert('Error', 'Please enter a valid 6-digit code'); return; }
    setJoining(true);
    try {
      const result = await joinFamily(joinCode.trim(), displayName.trim());
      if (result) {
        await saveFamilyState({ familyId: result.familyId, familyCode: joinCode.trim(), displayName: displayName.trim() });
        Alert.alert('Joined!', `You've joined ${result.familyName}`);
      } else {
        Alert.alert('Invalid Code', 'No family found with this code. Please check and try again.');
      }
    } catch (e) { Alert.alert('Error', 'Something went wrong.'); }
    finally { setJoining(false); }
  };

  // ============ FAMILY HANDLERS ============

  const handleShareCode = async () => {
    if (!familyState) return;
    await Share.share({ message: `Join our family pantry on PantryPal! Use code: ${familyState.familyCode}` });
  };

  const handleAddSharedItem = async () => {
    if (!familyState || !newItemName.trim()) return;
    await addToSharedList(familyState.familyId, { name: newItemName.trim(), category: 'Other', unit: 'pieces', quantity: 1 });
    setNewItemName('');
    await loadSharedList();
  };

  const handleToggleItem = async (item: any) => {
    await toggleSharedItemPurchased(item.id, !item.is_purchased);
    await loadSharedList();
  };

  const handleRemoveItem = async (item: any) => {
    await removeFromSharedList(item.id);
    await loadSharedList();
  };

  const handleSyncPantry = async () => {
    if (!familyState) return;
    setSyncing(true);
    try {
      const items = await getAllItems();
      const pantryData = items.map((i) => ({ name: i.name, category: i.category, unit: i.unit, currentQuantity: i.currentQuantity, threshold: i.threshold, expiryDate: i.expiryDate }));
      const success = await syncPantryToCloud(familyState.familyId, pantryData);
      if (success) Alert.alert('Synced!', 'Your pantry is now visible to family members.');
      else Alert.alert('Error', 'Sync failed. Check your connection.');
    } catch (e) { Alert.alert('Error', 'Sync failed.'); }
    finally { setSyncing(false); }
  };

  const handleLeaveFamily = () => {
    Alert.alert('Leave Family', 'Are you sure? You can rejoin later with the same code.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setFamilyState(null);
        setViewMode('setup');
        setMembers([]);
        setSharedList([]);
      }},
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await loadFamilyData(); setRefreshing(false); };

  if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;

  // ============ SETUP VIEW ============
  if (viewMode === 'setup') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.md }} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <Ionicons name="people-outline" size={40} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Family Sharing</Text>
          <Text style={styles.headerSubtitle}>Share your pantry and shopping list with family members in real-time. No login required!</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput style={styles.input} placeholder="e.g., Satya" placeholderTextColor={COLORS.textLight} value={displayName} onChangeText={setDisplayName} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create New Family</Text>
          <Text style={styles.sectionDesc}>Start a new family group and invite others with a code.</Text>
          <TouchableOpacity style={[styles.primaryBtn, creating && styles.btnDisabled]} onPress={handleCreateFamily} disabled={creating}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{creating ? 'Creating...' : 'Create Family'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} /></View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join Existing Family</Text>
          <Text style={styles.sectionDesc}>Enter the 6-digit code shared by a family member.</Text>
          <TextInput style={[styles.input, styles.codeInput]} placeholder="Enter 6-digit code" placeholderTextColor={COLORS.textLight} value={joinCode} onChangeText={setJoinCode} keyboardType="number-pad" maxLength={6} />
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.secondary }, joining && styles.btnDisabled]} onPress={handleJoinFamily} disabled={joining}>
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{joining ? 'Joining...' : 'Join Family'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ============ FAMILY VIEW ============
  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
        {/* Family Info */}
        <View style={styles.familyCard}>
          <View style={styles.familyHeader}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
            <Text style={styles.familyTitle}>{familyState?.displayName}'s Family</Text>
          </View>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Family Code:</Text>
            <Text style={styles.codeValue}>{familyState?.familyCode}</Text>
            <TouchableOpacity onPress={handleShareCode}>
              <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.membersLabel}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
          <View style={styles.membersList}>
            {members.map((m, idx) => (
              <View key={idx} style={styles.memberChip}>
                <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.memberName}>{m.displayName}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sync Pantry */}
        <TouchableOpacity style={styles.syncBtn} onPress={handleSyncPantry} disabled={syncing}>
          <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
          <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync My Pantry to Family'}</Text>
        </TouchableOpacity>

        {/* Shared Shopping List */}
        <View style={styles.sharedSection}>
          <Text style={styles.sharedTitle}>Shared Shopping List</Text>
          <View style={styles.addRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Add item..." placeholderTextColor={COLORS.textLight} value={newItemName} onChangeText={setNewItemName} onSubmitEditing={handleAddSharedItem} />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddSharedItem}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {sharedList.length === 0 ? (
            <Text style={styles.emptyText}>No items yet. Add items to the shared list!</Text>
          ) : (
            sharedList.map((item) => (
              <View key={item.id} style={[styles.listItem, item.is_purchased && styles.listItemDone]}>
                <TouchableOpacity onPress={() => handleToggleItem(item)}>
                  <Ionicons name={item.is_purchased ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.is_purchased ? COLORS.success : COLORS.textLight} />
                </TouchableOpacity>
                <View style={styles.listItemContent}>
                  <Text style={[styles.listItemName, item.is_purchased && styles.listItemNameDone]}>{item.name}</Text>
                  {item.added_by && <Text style={styles.listItemBy}>Added by member</Text>}
                </View>
                <TouchableOpacity onPress={() => handleRemoveItem(item)}>
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Leave Family */}
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveFamily}>
          <Ionicons name="exit-outline" size={18} color={COLORS.danger} />
          <Text style={styles.leaveBtnText}>Leave Family</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.lg, ...SHADOWS.sm },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm },
  headerSubtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs, lineHeight: 20 },
  field: { marginBottom: SPACING.lg },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, fontSize: FONT_SIZES.md, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  codeInput: { fontSize: FONT_SIZES.xxl, fontWeight: '700', textAlign: 'center', letterSpacing: 8, marginBottom: SPACING.md },
  section: { backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, ...SHADOWS.sm },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  sectionDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.md },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.md },
  primaryBtnText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: SPACING.md, color: COLORS.textSecondary, fontWeight: '600' },
  // Family view
  familyCard: { backgroundColor: COLORS.surface, margin: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm },
  familyHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  familyTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  codeLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  codeValue: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.primary, letterSpacing: 2 },
  membersLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  membersList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  memberChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.successBg, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full, gap: 4 },
  memberName: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '500' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: SPACING.md, marginBottom: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary, gap: SPACING.sm },
  syncBtnText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '500' },
  sharedSection: { margin: SPACING.md },
  sharedTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  addRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  addBtn: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: SPACING.lg },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, gap: SPACING.sm, ...SHADOWS.sm },
  listItemDone: { opacity: 0.6 },
  listItemContent: { flex: 1 },
  listItemName: { fontSize: FONT_SIZES.md, color: COLORS.text, fontWeight: '500' },
  listItemNameDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  listItemBy: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: SPACING.md, marginTop: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.danger, gap: SPACING.sm },
  leaveBtnText: { fontSize: FONT_SIZES.md, color: COLORS.danger, fontWeight: '500' },
});

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  createHousehold,
  joinHousehold,
  getMyHousehold,
  getHouseholdMembers,
  leaveHousehold,
  Household,
  HouseholdMember,
} from '../services/household';

export default function HouseholdScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadHousehold();
      } else {
        setLoading(false);
      }
    }, [isAuthenticated])
  );

  const loadHousehold = async () => {
    setLoading(true);
    try {
      const { household: h } = await getMyHousehold();
      setHousehold(h);
      if (h) {
        const m = await getHouseholdMembers();
        setMembers(m);
      }
    } catch (error) {
      console.error('Failed to load household:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!householdName.trim()) {
      Alert.alert('Error', 'Please enter a name for your household.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createHousehold(householdName.trim());
      if (result.success) {
        Alert.alert('Success', 'Household created! Share the invite code with family members.');
        setShowCreate(false);
        setHouseholdName('');
        await loadHousehold();
      } else {
        Alert.alert('Error', result.error || 'Failed to create household.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-character invite code.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await joinHousehold(inviteCode.trim());
      if (result.success) {
        Alert.alert('Success', `Joined "${result.household?.name}" household!`);
        setShowJoin(false);
        setInviteCode('');
        await loadHousehold();
      } else {
        Alert.alert('Error', result.error || 'Failed to join household.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Household',
      'Are you sure you want to leave this household? Your synced items will remain for other members.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const result = await leaveHousehold();
            if (result.success) {
              setHousehold(null);
              setMembers([]);
            } else {
              Alert.alert('Error', result.error || 'Failed to leave household.');
            }
          },
        },
      ]
    );
  };

  const handleShareCode = async () => {
    if (!household) return;
    try {
      await Share.share({
        message: `Join my PantryPal household "${household.name}"!\n\nInvite code: ${household.invite_code}\n\nDownload PantryPal, sign in, and enter this code to share our pantry.`,
      });
    } catch {}
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={colors.textLight} />
        <Text style={styles.emptyTitle}>Sign in required</Text>
        <Text style={styles.emptySubtitle}>
          Please sign in from Settings to use household sharing.
        </Text>
      </View>
    );
  }

  // ─── USER HAS A HOUSEHOLD ───────────────────────────────────────────────
  if (household) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Household Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="home" size={28} color={colors.primary} />
            <Text style={styles.householdName}>{household.name}</Text>
          </View>

          <View style={styles.inviteCodeSection}>
            <Text style={styles.inviteLabel}>Invite Code</Text>
            <View style={styles.inviteCodeRow}>
              <Text style={styles.inviteCode}>{household.invite_code}</Text>
              <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
                <Ionicons name="share-outline" size={20} color={colors.surface} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inviteHint}>
              Share this code with family members to join your household
            </Text>
          </View>
        </View>

        {/* Members */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          {members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {(member.display_name || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.display_name || 'Unknown'}
                  {member.user_id === user?.id ? ' (You)' : ''}
                </Text>
                <Text style={styles.memberRole}>{member.role === 'owner' ? 'Owner' : 'Member'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Leave */}
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
          <Ionicons name="exit-outline" size={20} color={colors.danger} />
          <Text style={styles.leaveButtonText}>Leave Household</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── NO HOUSEHOLD: CREATE OR JOIN ───────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.emptyCard}>
        <Ionicons name="people-outline" size={64} color={colors.textLight} />
        <Text style={styles.emptyTitle}>No Household</Text>
        <Text style={styles.emptySubtitle}>
          Create a household to share your pantry with family, or join an existing one.
        </Text>
      </View>

      {/* Create */}
      {!showCreate && !showJoin && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setShowCreate(true)}>
            <Ionicons name="add-circle-outline" size={22} color={colors.surface} />
            <Text style={styles.primaryButtonText}>Create Household</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowJoin(true)}>
            <Ionicons name="enter-outline" size={22} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Join with Code</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Form */}
      {showCreate && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create Household</Text>
          <TextInput
            style={styles.input}
            value={householdName}
            onChangeText={setHouseholdName}
            placeholder="e.g. The Smiths, Home, Our Flat"
            placeholderTextColor={colors.textLight}
            autoFocus
          />
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowCreate(false); setHouseholdName(''); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Join Form */}
      {showJoin && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Join Household</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase())}
            placeholder="6-character code"
            placeholderTextColor={colors.textLight}
            autoCapitalize="characters"
            maxLength={6}
            autoFocus
          />
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowJoin(false); setInviteCode(''); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    emptyCard: { alignItems: 'center', padding: SPACING.xl, marginBottom: SPACING.lg },
    emptyTitle: { fontSize: FONT_SIZES.xl, fontWeight: '600', color: colors.text, marginTop: SPACING.md },
    emptySubtitle: { fontSize: FONT_SIZES.md, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
    card: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
    householdName: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: colors.text },
    inviteCodeSection: { backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
    inviteLabel: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: '600' },
    inviteCodeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
    inviteCode: { fontSize: FONT_SIZES.xxxl, fontWeight: '700', color: colors.primary, letterSpacing: 4 },
    shareButton: { backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
    inviteHint: { fontSize: FONT_SIZES.xs, color: colors.textLight, marginTop: SPACING.sm },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: colors.text, marginBottom: SPACING.sm },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight + '30', justifyContent: 'center', alignItems: 'center' },
    memberAvatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: colors.primary },
    memberInfo: { flex: 1 },
    memberName: { fontSize: FONT_SIZES.md, fontWeight: '500', color: colors.text },
    memberRole: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, marginTop: 2 },
    leaveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md, marginTop: SPACING.md, borderWidth: 1, borderColor: colors.danger, borderRadius: BORDER_RADIUS.md },
    leaveButtonText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: colors.danger },
    actionButtons: { gap: SPACING.md },
    primaryButton: { backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, ...SHADOWS.md },
    primaryButtonText: { color: colors.surface, fontSize: FONT_SIZES.lg, fontWeight: '700' },
    secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
    secondaryButtonText: { color: colors.primary, fontSize: FONT_SIZES.lg, fontWeight: '700' },
    formCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
    formTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: colors.text, marginBottom: SPACING.md },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: FONT_SIZES.lg, color: colors.text },
    codeInput: { textAlign: 'center', letterSpacing: 6, fontSize: FONT_SIZES.xxl, fontWeight: '700' },
    formButtons: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
    cancelButton: { flex: 1, padding: SPACING.md, alignItems: 'center', borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border },
    cancelButtonText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.textSecondary },
    submitButton: { flex: 1, padding: SPACING.md, alignItems: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: colors.primary },
    submitButtonText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: colors.surface },
    buttonDisabled: { opacity: 0.6 },
  });

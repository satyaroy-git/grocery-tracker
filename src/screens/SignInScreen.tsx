import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function SignInScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const { signIn, signInGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (!result.success) {
        Alert.alert('Sign In Failed', result.error || 'Please check your credentials and try again.');
      } else {
        // Sign in succeeded - go back to Settings which will now show
        // the authenticated state (display name, manage household link)
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInGoogle();
      if (!result.success) {
        Alert.alert('Google Sign In', result.error || 'Failed to sign in with Google.');
      }
      // For OAuth, the URL is returned in result.error field (used as data carrier)
      // In a full implementation, this would open a web browser
      if (result.success && result.error) {
        // result.error contains the OAuth URL - in Expo Go this would need
        // expo-web-browser to open. For now, show a helpful message.
        Alert.alert(
          'Google Sign-In',
          'Google Sign-In requires a development build. Please use email/password for now, or create a development build for full Google OAuth support.'
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to sync your pantry with household members
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signInButton, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={colors.surface} />
                <Text style={styles.signInButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={colors.text} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp' as never)}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Skip option */}
        <TouchableOpacity style={styles.skipButton} onPress={() => navigation.goBack()}>
          <Text style={styles.skipButtonText}>Skip for now (use offline only)</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
    header: { alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.xl },
    iconCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.successBg, justifyContent: 'center', alignItems: 'center',
    },
    title: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: colors.text, marginTop: SPACING.md },
    subtitle: { fontSize: FONT_SIZES.md, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
    form: { gap: SPACING.md },
    field: { gap: SPACING.xs },
    label: { fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.text },
    inputContainer: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    },
    input: { flex: 1, fontSize: FONT_SIZES.lg, color: colors.text, paddingVertical: SPACING.xs },
    signInButton: {
      backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
      marginTop: SPACING.sm, ...SHADOWS.md,
    },
    buttonDisabled: { opacity: 0.6 },
    signInButtonText: { color: colors.surface, fontSize: FONT_SIZES.lg, fontWeight: '700' },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { paddingHorizontal: SPACING.md, fontSize: FONT_SIZES.sm, color: colors.textSecondary },
    googleButton: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    },
    googleButtonText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: colors.text },
    footer: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xs, marginTop: SPACING.xl },
    footerText: { fontSize: FONT_SIZES.md, color: colors.textSecondary },
    footerLink: { fontSize: FONT_SIZES.md, fontWeight: '700', color: colors.primary },
    skipButton: { alignItems: 'center', marginTop: SPACING.md, padding: SPACING.sm },
    skipButtonText: { fontSize: FONT_SIZES.sm, color: colors.textLight },
  });

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllItems } from '../database';
import { getRecipeSuggestions, getRecipeDetails, Recipe } from '../utils/recipeApi';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface RecipeSuggestion {
  recipe: Recipe;
  matchedIngredients: string[];
}

export default function RecipeSuggestionsScreen() {
  const navigation = useNavigation();
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [pantryItemNames, setPantryItemNames] = useState<string[]>([]);
  const [matchedForSelected, setMatchedForSelected] = useState<string[]>([]);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getAllItems();
      const names = items.map((item) => item.name);
      setPantryItemNames(names);

      if (names.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const results = await getRecipeSuggestions(names);
      setSuggestions(results);
    } catch (error) {
      // error handled silently
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const handleRecipePress = async (suggestion: RecipeSuggestion) => {
    setDetailsLoading(true);
    setMatchedForSelected(suggestion.matchedIngredients);

    try {
      const details = await getRecipeDetails(suggestion.recipe.id);
      if (details) {
        setSelectedRecipe(details);
      }
    } catch (error) {
      // error handled silently
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedRecipe(null);
    setMatchedForSelected([]);
  };

  const isIngredientFromPantry = (ingredient: string): boolean => {
    const ingredientLower = ingredient.toLowerCase();
    return pantryItemNames.some(
      (name) =>
        ingredientLower.includes(name.toLowerCase()) ||
        name.toLowerCase().includes(ingredientLower.split(' ').pop() || '')
    );
  };

  const renderRecipeCard = ({ item }: { item: RecipeSuggestion }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => handleRecipePress(item)}
      activeOpacity={0.7}
    >
      {item.recipe.thumbnail ? (
        <Image source={{ uri: item.recipe.thumbnail }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, { backgroundColor: COLORS.successBg, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="restaurant-outline" size={36} color={COLORS.primary} />
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.recipeName} numberOfLines={2}>
          {item.recipe.name}
        </Text>

        {(item.recipe.area || item.recipe.category) ? (
          <View style={styles.metaRow}>
            {item.recipe.area ? (
              <View style={styles.metaChip}>
                <Ionicons name="globe-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{item.recipe.area}</Text>
              </View>
            ) : null}
            {item.recipe.category ? (
              <View style={styles.metaChip}>
                <Ionicons name="restaurant-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{item.recipe.category}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.matchedRow}>
          {item.matchedIngredients.map((ingredient) => (
            <View key={ingredient} style={styles.matchedChip}>
              <Text style={styles.matchedChipText}>{ingredient}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="nutrition-outline" size={64} color={COLORS.textLight} />
      <Text style={styles.emptyTitle}>No Recipes Yet</Text>
      <Text style={styles.emptyText}>
        Add more items to your pantry to get recipe suggestions
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding recipes for your pantry...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipe Suggestions</Text>
        <TouchableOpacity onPress={loadRecipes} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Recipe List */}
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.recipe.id}
        renderItem={renderRecipeCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Details Loading Overlay */}
      {detailsLoading && (
        <View style={styles.detailsLoadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* Recipe Detail Modal */}
      <Modal
        visible={selectedRecipe !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        {selectedRecipe && (
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header Image */}
              {selectedRecipe.thumbnail ? (
                <Image
                  source={{ uri: selectedRecipe.thumbnail }}
                  style={styles.modalImage}
                />
              ) : (
                <View style={[styles.modalImage, { backgroundColor: COLORS.successBg, justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="restaurant-outline" size={64} color={COLORS.primary} />
                  <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.primary, marginTop: SPACING.sm }}>{selectedRecipe.name}</Text>
                </View>
              )}

              {/* Close Button */}
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>

              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{selectedRecipe.name}</Text>

                {(selectedRecipe.area || selectedRecipe.category) ? (
                  <View style={styles.modalMeta}>
                    {selectedRecipe.area ? (
                      <View style={styles.modalMetaChip}>
                        <Ionicons name="globe-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.modalMetaText}>{selectedRecipe.area}</Text>
                      </View>
                    ) : null}
                    {selectedRecipe.category ? (
                      <View style={styles.modalMetaChip}>
                        <Ionicons name="restaurant-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.modalMetaText}>{selectedRecipe.category}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Ingredients */}
                <Text style={styles.sectionTitle}>Ingredients</Text>
                <View style={styles.ingredientsList}>
                  {selectedRecipe.ingredients.map((ingredient, index) => {
                    const fromPantry = isIngredientFromPantry(ingredient);
                    return (
                      <View
                        key={index}
                        style={[
                          styles.ingredientItem,
                          fromPantry && styles.ingredientItemPantry,
                        ]}
                      >
                        <Ionicons
                          name={fromPantry ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={fromPantry ? COLORS.success : COLORS.textSecondary}
                        />
                        <Text
                          style={[
                            styles.ingredientText,
                            fromPantry && styles.ingredientTextPantry,
                          ]}
                        >
                          {ingredient}
                        </Text>
                        {fromPantry && (
                          <View style={styles.pantryBadge}>
                            <Text style={styles.pantryBadgeText}>In Pantry</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Instructions */}
                <Text style={styles.sectionTitle}>Instructions</Text>
                <Text style={styles.instructionsText}>
                  {selectedRecipe.instructions}
                </Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xxl + SPACING.md,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  thumbnail: {
    width: 100,
    height: 120,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  recipeName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  matchedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  matchedChip: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  matchedChipText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    lineHeight: 22,
  },
  detailsLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  modalImage: {
    width: '100%',
    height: 250,
  },
  modalCloseButton: {
    position: 'absolute',
    top: SPACING.xxl,
    right: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  modalMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modalMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  modalMetaText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  ingredientsList: {
    gap: SPACING.sm,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  ingredientItemPantry: {
    backgroundColor: COLORS.successBg,
  },
  ingredientText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  ingredientTextPantry: {
    color: COLORS.primaryDark,
    fontWeight: '500',
  },
  pantryBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  pantryBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.surface,
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 24,
  },
});

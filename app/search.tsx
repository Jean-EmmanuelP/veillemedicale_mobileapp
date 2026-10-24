import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  SafeAreaView,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { convex, api } from '../lib/convex';
import { Article } from '../types';
import ArticleItem from '../components/ArticleItem';
import ArticleModal from '../components/ArticleModal';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../assets/constants/fonts';
import { useAppSelector } from '../store/hooks';

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchArticles = useCallback(async (query: string, loadMore = false) => {
    if (!query.trim()) {
      setResults([]);
      setHasMore(true);
      setOffset(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const currentOffset = loadMore ? offset : 0;

    try {
      // Recherche via Convex (search index) — l'état user (is_liked/is_read/is_thumbed_up)
      // est déjà inclus dans les lignes renvoyées ; plus besoin de requêtes par résultat.
      const res: any = await convex.query(api.articles.getArticlesFeed, {
        search: query.trim(),
        userId: user?.id ?? undefined,
        offset: currentOffset,
      });
      const rows: any[] = res?.data ?? [];

      if (loadMore) {
        setResults(prev => [...prev, ...rows]);
      } else {
        setResults(rows);
      }

      setHasMore(rows.length === 10);
      setOffset(loadMore ? currentOffset + 10 : 10);
    } catch (error: any) {
      console.error('Search error:', error);
      const errorMessage = error?.message?.includes('network') || error?.message?.includes('fetch')
        ? 'Erreur de connexion réseau'
        : 'Une erreur est survenue lors de la recherche';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [offset, user?.id]);

  const handleRetry = () => {
    if (searchQuery.trim()) {
      searchArticles(searchQuery, false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length >= 2) {
      searchArticles(text, false);
    } else {
      setResults([]);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && searchQuery.trim()) {
      searchArticles(searchQuery, true);
    }
  };

  const openArticleModal = (article: Article) => {
    setSelectedArticle(article);
    setModalVisible(true);
  };

  const closeArticleModal = () => {
    setModalVisible(false);
    setSelectedArticle(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.iconPrimary} />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.iconSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un article..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={COLORS.iconSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && offset === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.iconPrimary} />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Vérifiez votre connexion internet</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color={COLORS.textOnPrimaryButton} />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : results.length === 0 && searchQuery.trim().length >= 2 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={COLORS.iconSecondary} />
          <Text style={styles.emptyText}>Aucun résultat trouvé</Text>
          <Text style={styles.emptySubtext}>Essayez avec d'autres mots-clés</Text>
        </View>
      ) : searchQuery.trim().length < 2 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.iconSecondary} />
          <Text style={styles.emptyText}>Rechercher des articles</Text>
          <Text style={styles.emptySubtext}>Entrez au moins 2 caractères pour rechercher</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={({ item }) => (
            <ArticleItem
              article={item}
              onPress={openArticleModal}
              onLinkPress={() => {}}
              onLikePress={() => {}}
              onThumbsUpPress={() => {}}
              onToggleDownloadPress={() => {}}
              isDownloaded={false}
              isDownloadLoading={false}
            />
          )}
          keyExtractor={(item) => item.article_id.toString()}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && offset > 0 ? (
              <ActivityIndicator size="small" color={COLORS.iconPrimary} style={styles.footerLoader} />
            ) : null
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      <ArticleModal visible={modalVisible} article={selectedArticle} onClose={closeArticleModal} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    backgroundColor: COLORS.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderPrimary,
  } as ViewStyle,
  backButton: {
    padding: 8,
    marginRight: 8,
  } as ViewStyle,
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 0,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
  } as ViewStyle,
  searchIcon: {
    marginRight: 8,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    paddingVertical: 12,
  } as TextStyle,
  clearButton: {
    padding: 4,
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  } as ViewStyle,
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
  } as TextStyle,
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  } as ViewStyle,
  emptyText: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans.bold,
    textAlign: 'center',
  } as TextStyle,
  emptySubtext: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    textAlign: 'center',
  } as TextStyle,
  listContainer: {
    paddingBottom: 20,
  } as ViewStyle,
  footerLoader: {
    marginVertical: 20,
  } as ViewStyle,
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  } as ViewStyle,
  errorText: {
    marginTop: 16,
    color: COLORS.error,
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans.bold,
    textAlign: 'center',
  } as TextStyle,
  errorSubtext: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    textAlign: 'center',
  } as TextStyle,
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.buttonBackgroundPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 0,
    marginTop: 20,
  } as ViewStyle,
  retryButtonText: {
    color: COLORS.textOnPrimaryButton,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    marginLeft: 8,
  } as TextStyle,
});

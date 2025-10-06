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
import { supabase } from '../lib/supabase';
import { Article } from '../types';
import ArticleItem from '../components/ArticleItem';
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

  const searchArticles = useCallback(async (query: string, loadMore = false) => {
    if (!query.trim()) {
      setResults([]);
      setHasMore(true);
      setOffset(0);
      return;
    }

    setLoading(true);
    const currentOffset = loadMore ? offset : 0;

    try {
      const { data, error } = await supabase.rpc('search_showed_articles_fts', {
        p_query: query.trim(),
        p_limit: 20,
        p_offset: currentOffset,
      });

      if (error) throw error;

      const articlesWithUserData = await Promise.all(
        (data || []).map(async (article: any) => {
          if (!user?.id) {
            return {
              ...article,
              is_liked: false,
              is_read: false,
              is_thumbed_up: false,
            };
          }

          const [likeCheck, readCheck, thumbsUpCheck] = await Promise.all([
            supabase.from('article_likes').select('id').eq('article_id', article.article_id).eq('user_id', user.id).maybeSingle(),
            supabase.from('article_read').select('read_at').eq('article_id', article.article_id).eq('user_id', user.id).maybeSingle(),
            supabase.from('article_thumbs_up').select('thumbed_up_at').eq('article_id', article.article_id).eq('user_id', user.id).maybeSingle(),
          ]);

          return {
            ...article,
            is_liked: !!likeCheck.data,
            is_read: !!readCheck.data,
            is_thumbed_up: !!thumbsUpCheck.data,
          };
        })
      );

      if (loadMore) {
        setResults(prev => [...prev, ...articlesWithUserData]);
      } else {
        setResults(articlesWithUserData);
      }

      setHasMore((data || []).length === 20);
      setOffset(loadMore ? currentOffset + 20 : 20);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [offset, user?.id]);

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

  const handleArticlePress = (article: Article) => {
    router.push({
      pathname: '/article-detail',
      params: { articleId: article.article_id },
    });
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
              onPress={handleArticlePress}
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
    borderBottomColor: '#2A2A2A',
  } as ViewStyle,
  backButton: {
    padding: 8,
    marginRight: 8,
  } as ViewStyle,
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
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
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ViewStyle,
  TextStyle,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchLikedArticles, toggleLike, toggleThumbsUp } from '../../store/articlesSlice';
import ArticleItem from '../../components/ArticleItem';
import TopHeader from '../../components/TopHeader';
import { Article } from '../../types';
import { FONTS, FONT_SIZES } from '../../assets/constants/fonts';
import { COLORS } from '../../assets/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FavoritesScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isAnonymous } = useAppSelector((state) => state.auth);
  const { likedArticles, loadingLikedArticles, errorLikedArticles } = useAppSelector((state) => state.articles);
  
  const [refreshing, setRefreshing] = useState(false);
  const [downloadedArticles, setDownloadedArticles] = useState<any[]>([]);
  const [downloadLoadingIds, setDownloadLoadingIds] = useState<number[]>([]);
  const [likeLoadingIds, setLikeLoadingIds] = useState<number[]>([]);
  const [thumbsUpLoadingIds, setThumbsUpLoadingIds] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      console.log('❤️ [FAVORITES] Screen focused with user:', {
        userId: user?.id,
        isAnonymous,
        hasUser: !!user
      });

      // Ne charger les articles que pour les utilisateurs NON-anonymes
      if (user?.id && !isAnonymous) {
        console.log('❤️ [FAVORITES] Loading liked articles for authenticated user...');
        dispatch(fetchLikedArticles({ userId: user.id }));
      } else if (isAnonymous) {
        console.log('👤 [FAVORITES] Anonymous user - skipping liked articles fetch');
      } else {
        console.log('❌ [FAVORITES] No user found');
      }

      // Charger les téléchargements depuis AsyncStorage (disponible pour tous)
      AsyncStorage.getItem('downloadedArticles').then(data => {
        if (data) setDownloadedArticles(JSON.parse(data));
        else setDownloadedArticles([]);
      }).catch(error => {
        console.error('❌ [FAVORITES] Error loading downloaded articles:', error);
        setDownloadedArticles([]);
      });
    }, [user?.id, isAnonymous])
  );

  useEffect(() => {
    // Rafraîchir téléchargés à chaque changement (ex: après un download)
    AsyncStorage.getItem('downloadedArticles').then(data => {
      if (data) setDownloadedArticles(JSON.parse(data));
      else setDownloadedArticles([]);
    }).catch(error => {
      console.error('❌ [FAVORITES] Error in useEffect loading downloaded articles:', error);
      setDownloadedArticles([]);
    });
  }, [likedArticles.length]);

  // Debug effect to log current state
  useEffect(() => {
    console.log('🐛 [FAVORITES] Current state:', {
      user: !!user,
      userId: user?.id,
      isAnonymous,
      likedArticlesCount: likedArticles.length,
      loadingLikedArticles,
      errorLikedArticles,
      refreshing
    });
  }, [user, isAnonymous, likedArticles, loadingLikedArticles, errorLikedArticles, refreshing]);

  const handleRefresh = async () => {
    if (!user?.id || isAnonymous) {
      console.log('❌ [FAVORITES] Refresh skipped - anonymous user or no user');
      return;
    }
    
    setRefreshing(true);
    console.log('🔄 [FAVORITES] Refreshing liked articles...');
    try {
      await dispatch(fetchLikedArticles({ userId: user.id }));
    } catch (error) {
      console.error('❌ [FAVORITES] Error refreshing liked articles:', error);
    }
    setRefreshing(false);
  };

  const handleToggleDownload = async (article: any) => {
    setDownloadLoadingIds(ids => [...ids, article.article_id]);
    try {
      const data = await AsyncStorage.getItem('downloadedArticles');
      let downloaded = data ? JSON.parse(data) : [];
      const isDownloaded = downloaded.some((a: any) => a.article_id === article.article_id);
      if (isDownloaded) {
        downloaded = downloaded.filter((a: any) => a.article_id !== article.article_id);
      } else {
        downloaded.push(article);
      }
      await AsyncStorage.setItem('downloadedArticles', JSON.stringify(downloaded));
      setDownloadedArticles(downloaded);
    } catch (error) {
      console.error('❌ [FAVORITES] Error toggling download:', error);
    } finally {
      setDownloadLoadingIds(ids => ids.filter(id => id !== article.article_id));
    }
  };

  const handleLike = async (article: any) => {
    if (!user?.id || isAnonymous) {
      console.log('❌ [FAVORITES] Like action blocked - anonymous user or no user');
      return;
    }

    console.log('❤️ [FAVORITES] Toggling like for article:', article.article_id);
    setLikeLoadingIds(ids => [...ids, article.article_id]);
    
    try {
      const result = await dispatch(toggleLike({ articleId: article.article_id, userId: user.id }));
      
      if (toggleLike.fulfilled.match(result)) {
        console.log('✅ [FAVORITES] Like toggled successfully');
        // Le toggleLike met déjà à jour les articles likés, pas besoin de refetch
      } else if (toggleLike.rejected.match(result)) {
        console.error('❌ [FAVORITES] Like toggle failed:', result.error);
        // En cas d'erreur, on peut refetch pour rester synchronisé
        await dispatch(fetchLikedArticles({ userId: user.id }));
      }
    } catch (error) {
      console.error('❌ [FAVORITES] Error in handleLike:', error);
      // En cas d'erreur, on refetch pour rester synchronisé
      try {
        await dispatch(fetchLikedArticles({ userId: user.id }));
      } catch (fetchError) {
        console.error('❌ [FAVORITES] Error refetching after like error:', fetchError);
      }
    } finally {
      setLikeLoadingIds(ids => ids.filter(id => id !== article.article_id));
    }
  };

  const handleThumbsUp = async (article: any) => {
    if (!user?.id || isAnonymous) {
      console.log('❌ [FAVORITES] Thumbs up action blocked - anonymous user or no user');
      return;
    }

    console.log('👍 [FAVORITES] Toggling thumbs up for article:', article.article_id);
    setThumbsUpLoadingIds(ids => [...ids, article.article_id]);
    
    try {
      const result = await dispatch(toggleThumbsUp({ articleId: article.article_id, userId: user.id }));
      
      if (toggleThumbsUp.fulfilled.match(result)) {
        console.log('✅ [FAVORITES] Thumbs up toggled successfully');
        // Le toggleThumbsUp met déjà à jour le state, pas besoin de refetch
      } else if (toggleThumbsUp.rejected.match(result)) {
        console.error('❌ [FAVORITES] Thumbs up toggle failed:', result.error);
        // En cas d'erreur, on peut refetch pour rester synchronisé
        await dispatch(fetchLikedArticles({ userId: user.id }));
      }
    } catch (error) {
      console.error('❌ [FAVORITES] Error in handleThumbsUp:', error);
      // En cas d'erreur, on refetch pour rester synchronisé
      try {
        await dispatch(fetchLikedArticles({ userId: user.id }));
      } catch (fetchError) {
        console.error('❌ [FAVORITES] Error refetching after thumbs up error:', fetchError);
      }
    } finally {
      setThumbsUpLoadingIds(ids => ids.filter(id => id !== article.article_id));
    }
  };

  const handleArticlePress = (article: Article) => {
    // Navigation vers l'article ou modal (à implémenter)
    console.log('📰 [FAVORITES] Article pressed:', article.article_id);
  };

  const handleLinkPress = (link: string) => {
    console.log('🔗 [FAVORITES] Link pressed:', link);
    // Ouvrir le lien dans le navigateur ou une webview
  };

  // Loading stylé avec header visible
  const renderLoadingContent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.iconPrimary} />
      <Text style={styles.loadingText}>Chargement de vos favoris...</Text>
    </View>
  );

  // Message pour utilisateurs anonymes
  const renderAnonymousMessage = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.anonymousTitle}>👤 Compte invité</Text>
      <Text style={styles.anonymousText}>
        Les favoris ne sont disponibles que pour les comptes permanents.
      </Text>
      <Text style={styles.anonymousSubText}>
        Créez un compte pour sauvegarder vos articles préférés !
      </Text>
    </View>
  );

  // Si utilisateur anonyme, afficher message spécifique
  if (isAnonymous) {
    return (
      <View style={styles.container}>
        <TopHeader title="Favoris" />
        {renderAnonymousMessage()}
      </View>
    );
  }

  // Si erreur pour utilisateur authentifié
  if (errorLikedArticles) {
    return (
      <View style={styles.container}>
        <TopHeader title="Favoris" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>❌ Erreur</Text>
          <Text style={styles.errorText}>{errorLikedArticles}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopHeader title="Favoris" />
      
      {/* Contenu conditionnel : Loading stylé ou Liste */}
      {(loadingLikedArticles && !refreshing) ? renderLoadingContent() : (
        <FlashList
          data={likedArticles}
          renderItem={({ item }: { item: Article }) => (
            <ArticleItem
              article={item}
              onPress={handleArticlePress}
              onLinkPress={handleLinkPress}
              onLikePress={handleLike}
              onThumbsUpPress={handleThumbsUp}
              onToggleDownloadPress={handleToggleDownload}
              isDownloaded={downloadedArticles.some((a: any) => a.article_id === item.article_id)}
              isDownloadLoading={downloadLoadingIds.includes(item.article_id)}
            />
          )}
          estimatedItemSize={150}
          keyExtractor={(item) => item.article_id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={COLORS.iconPrimary}
              colors={[COLORS.iconPrimary]}
            />
          }
          ListFooterComponent={loadingLikedArticles && !refreshing ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="large" color={COLORS.iconPrimary} />
              <Text style={styles.footerLoaderText}>Chargement...</Text>
            </View>
          ) : null}
          ListEmptyComponent={!loadingLikedArticles && !refreshing && likedArticles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>💝 Aucun favori</Text>
              <Text style={styles.emptyText}>
                Vous n'avez pas encore d'articles dans vos favoris.
              </Text>
              <Text style={styles.emptySubText}>
                Likez des articles pour les retrouver ici !
              </Text>
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.backgroundPrimary
  } as ViewStyle,
  listContainer: {
    paddingBottom: 100, // Space for glassmorphism navbar
  } as ViewStyle,
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: COLORS.backgroundPrimary,
  } as ViewStyle,
  errorText: { 
    color: COLORS.error,
    textAlign: 'center', 
    fontSize: FONT_SIZES.base, 
    fontFamily: FONTS.sans.regular 
  } as TextStyle,
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  } as ViewStyle,
  emptyText: { 
    color: COLORS.textSecondary,
    textAlign: 'center', 
    fontSize: FONT_SIZES.base, 
    fontFamily: FONTS.sans.regular,
    marginBottom: 10,
  } as TextStyle,
  emptySubText: {
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.medium,
  } as TextStyle,
  loader: { 
    marginVertical: 20 
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.backgroundPrimary,
  } as ViewStyle,
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
  } as TextStyle,
  errorTitle: {
    color: COLORS.error,
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.sans.bold,
    marginBottom: 10,
  } as TextStyle,
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  } as ViewStyle,
  retryButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.medium,
  } as TextStyle,
  anonymousTitle: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.sans.bold,
    marginBottom: 10,
  } as TextStyle,
  anonymousText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    textAlign: 'center',
    marginBottom: 10,
  } as TextStyle,
  anonymousSubText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.medium,
  } as TextStyle,
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  } as ViewStyle,
  footerLoaderText: {
    marginLeft: 10,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
  } as TextStyle,
  emptyTitle: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.sans.bold,
    marginBottom: 10,
  } as TextStyle,
}); 
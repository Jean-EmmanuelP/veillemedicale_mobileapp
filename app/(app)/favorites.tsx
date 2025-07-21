import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchSavedArticles, fetchLikedArticles, toggleLike, toggleThumbsUp } from '../../store/articlesSlice';
import ArticleItem from '../../components/ArticleItem';
import TopHeader from '../../components/TopHeader';
import * as Network from 'expo-network';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import ArticleModal from '../../components/ArticleModal';
import { COLORS } from '../../assets/constants/colors';
import { FONTS, FONT_SIZES } from '../../assets/constants/fonts';

export default function FavoritesScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const { items, savedArticleIds, likedArticles } = useAppSelector((state) => state.articles);
  const [downloadedArticles, setDownloadedArticles] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'downloaded' | 'liked' | null>(null);
  const [downloadLoadingIds, setDownloadLoadingIds] = useState<number[]>([]);
  const [likeLoadingIds, setLikeLoadingIds] = useState<number[]>([]);
  const [thumbsUpLoadingIds, setThumbsUpLoadingIds] = useState<number[]>([]);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchSavedArticles(user.id));
      dispatch(fetchLikedArticles({ userId: user.id }));
    }
    // Vérifie la connexion Expo
    let subscription: any;
    Network.getNetworkStateAsync().then(state => {
      setIsConnected(!!state.isConnected);
    });
    subscription = Network.addNetworkStateListener(state => {
      setIsConnected(!!state.isConnected);
    });
    // Charge les articles téléchargés
    AsyncStorage.getItem('downloadedArticles').then(data => {
      if (data) setDownloadedArticles(JSON.parse(data));
      setLoading(false);
    });
    return () => subscription && subscription.remove();
  }, [user?.id]);


  // Rafraîchir favoris et téléchargés en temps réel
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        dispatch(fetchSavedArticles(user.id));
        dispatch(fetchLikedArticles({ userId: user.id }));
      }
      // Rafraîchir téléchargés
      AsyncStorage.getItem('downloadedArticles').then(data => {
        if (data) setDownloadedArticles(JSON.parse(data));
        else setDownloadedArticles([]);
      });
    }, [user?.id])
  );

  useEffect(() => {
    // Rafraîchir téléchargés à chaque changement (ex: après un download)
    AsyncStorage.getItem('downloadedArticles').then(data => {
      if (data) setDownloadedArticles(JSON.parse(data));
      else setDownloadedArticles([]);
    });
  }, [items.length]);

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
    } catch (e) {
      console.error('Erreur lors du toggle téléchargement', e);
    } finally {
      setDownloadLoadingIds(ids => ids.filter(id => id !== article.article_id));
    }
  };

  const handleLike = async (article: any) => {
    if (!user?.id) return;
    setLikeLoadingIds(ids => [...ids, article.article_id]);
    await dispatch(toggleLike({ articleId: article.article_id, userId: user.id }));
    dispatch(fetchLikedArticles({ userId: user.id }));
    setLikeLoadingIds(ids => ids.filter(id => id !== article.article_id));
  };

  const handleThumbsUp = async (article: any) => {
    if (!user?.id) return;
    setThumbsUpLoadingIds(ids => [...ids, article.article_id]);
    await dispatch(toggleThumbsUp({ articleId: article.article_id, userId: user.id }));
    dispatch(fetchLikedArticles({ userId: user.id }));
    setThumbsUpLoadingIds(ids => ids.filter(id => id !== article.article_id));
  };

  const handleProfilePress = () => {
    router.push('/(app)/profile');
  };

  return (
    <View style={styles.container}>
      <TopHeader 
        title="Favoris" 
        onProfilePress={handleProfilePress}
      />
      
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Vous êtes hors connexion. Rendez-vous dans l'onglet Favoris pour lire vos articles téléchargés.</Text>
        </View>
      )}
      
      <FlatList
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <>
            <Text style={styles.sectionTitle}>📥 Téléchargés</Text>
            {downloadedArticles.length === 0 && <Text style={styles.emptyText}>Aucun article téléchargé</Text>}
            <FlatList
              data={downloadedArticles}
              keyExtractor={item => item.article_id.toString()}
              renderItem={({ item }) => (
                <ArticleItem
                  article={item}
                  onPress={() => { setSelectedArticle(item); setModalType('downloaded'); }}
                  onLinkPress={() => {}}
                  onLikePress={() => {}}
                  onThumbsUpPress={() => {}}
                  isDownloaded={true}
                  onToggleDownloadPress={handleToggleDownload}
                  isDownloadLoading={downloadLoadingIds.includes(item.article_id)}
                />
              )}
              scrollEnabled={false}
            />
            <Text style={styles.sectionTitle}>❤️ Favoris</Text>
            {likedArticles.length === 0 && <Text style={styles.emptyText}>Aucun article en favori</Text>}
          </>
        }
        data={likedArticles}
        keyExtractor={item => item.article_id.toString()}
        renderItem={({ item }) => (
          <ArticleItem
            article={item}
            onPress={() => { setSelectedArticle(item); setModalType('liked'); }}
            onLinkPress={() => {}}
            onLikePress={() => handleLike(item)}
            onThumbsUpPress={() => !thumbsUpLoadingIds.includes(item.article_id) && handleThumbsUp(item)}
          />
        )}
        ListEmptyComponent={loading ? <ActivityIndicator /> : null}
      />
      
      <ArticleModal
        visible={!!selectedArticle}
        article={selectedArticle}
        onClose={() => { setSelectedArticle(null); setModalType(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  listContainer: {
    paddingBottom: 100, // Space for glassmorphism navbar
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginTop: 20, 
    marginLeft: 16,
    color: COLORS.textPrimary,
  },
  emptyText: { 
    color: COLORS.textSecondary, 
    marginLeft: 16, 
    marginBottom: 10 
  },
  offlineBanner: { 
    backgroundColor: '#FFD600', 
    padding: 10 
  },
  offlineText: { 
    color: '#333', 
    textAlign: 'center' 
  },
}); 
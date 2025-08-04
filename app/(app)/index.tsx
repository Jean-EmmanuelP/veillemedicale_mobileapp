import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  RefreshControl,
  Linking,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  fetchArticles, 
  fetchAllDisciplinesStructure,
  fetchSubDisciplinesForFilter,
  setSelectedDiscipline,
  setSelectedSubDiscipline,
  setSelectedGrade,
  toggleLike,
  toggleRead,
  toggleThumbsUp,
  clearArticles,
  resetFiltersToAll,
  type DisciplineStructure,
} from '../../store/articlesSlice';
import FilterHeader from '../../components/FilterHeader';
import ToggleFilter from '../../components/ToggleFilter';
import ArticleItem from '../../components/ArticleItem';
import ArticleModal from '../../components/ArticleModal';
import TopHeader from '../../components/TopHeader';
import GuestAccountModal from '../../components/GuestAccountModal';
import { Article } from '../../types';
import { FONTS, FONT_SIZES } from '../../assets/constants/fonts';
import { COLORS } from '../../assets/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define a union type for items in FlashList: string for headers, Article for items
type ListItem = string | Article;

export default function ArticlesScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { 
    items: articles,
    loadingItems: loadingArticles,
    errorItems: errorArticles,
    hasMoreItems: hasMoreArticles,
    selectedDiscipline,
    selectedSubDiscipline,
    allDisciplines,
    subDisciplinesForFilter,
    selectedGrade,
  } = useAppSelector((state) => state.articles);
  const { user, isAnonymous } = useAppSelector((state) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'articles' | 'recommandations'>('all');
  const [offset, setOffset] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [downloadedArticles, setDownloadedArticles] = useState<any[]>([]);
  const [downloadLoadingIds, setDownloadLoadingIds] = useState<number[]>([]);
  const [downloadedVersion, setDownloadedVersion] = useState(0);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalFeature, setGuestModalFeature] = useState<string>('');

  const allowedGrades = useMemo(() => {
    if (!selectedGrade || selectedGrade === 'all') return null;
    return [selectedGrade];
  }, [selectedGrade]);

  // Prépare les données filtrées selon le toggle
  const filteredArticles = useMemo(() => {
    if (filterType === 'all') return articles;
    if (filterType === 'articles') return articles.filter(a => !a.is_recommandation);
    if (filterType === 'recommandations') return articles.filter(a => a.is_recommandation);
    return articles;
  }, [articles, filterType]);

  const listData = useMemo((): ListItem[] => {
    const data: ListItem[] = [];
    
    let articlesToList = [...filteredArticles];

    if (articlesToList.length > 0 && articlesToList[0].is_article_of_the_day) {
      data.push("🔥 Article du jour");
      data.push(articlesToList.shift()!); // Add the AOTD article
    }

    if (articlesToList.length > 0) {
      if (data.length > 0) { // If AOTD was added, then these are "previous"
        data.push("📖 Articles précédents");
      }
      articlesToList.forEach(article => data.push(article));
    }
    return data;
  }, [filteredArticles]);

  const stickyHeaderIndices = useMemo(() => 
    listData
      .map((item, index) => (typeof item === 'string' ? index : null))
      .filter(item => item !== null) as number[],
    [listData]
  );

  // Load disciplines and articles on initial load
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce) {
        console.log('Loading all disciplines...');
        dispatch(fetchAllDisciplinesStructure());
        loadArticles(true, 0, filterType, allowedGrades).then(() => setHasLoadedOnce(true));
      }
      
      // Load downloaded articles from AsyncStorage
      AsyncStorage.getItem('downloadedArticles').then(data => {
        if (data) setDownloadedArticles(JSON.parse(data));
        else setDownloadedArticles([]);
      });
      return () => {};
    }, [])
  );

  useEffect(() => {
    setOffset(0);
    setHasLoadedOnce(false);
  }, [selectedDiscipline, selectedSubDiscipline, allowedGrades]);

  useEffect(() => {
    // Reload articles when filter type changes - need server call for recommendations
    if (hasLoadedOnce) {
      console.log('📰 [LES ARTICLES] Filter type changed, reloading...');
      setOffset(0);
      setHasLoadedOnce(false);
    }
  }, [filterType]);

  useEffect(() => {
    if (!hasLoadedOnce) {
      console.log('📰 [LES ARTICLES] Loading articles...');
      loadArticles(true, 0, filterType, allowedGrades).then(() => setHasLoadedOnce(true));
    }
  }, [hasLoadedOnce, selectedDiscipline, selectedSubDiscipline, filterType, allowedGrades]);

  useEffect(() => {
    // Rafraîchir téléchargés à chaque changement (ex: après un download)
    AsyncStorage.getItem('downloadedArticles').then(data => {
      if (data) setDownloadedArticles(JSON.parse(data));
      else setDownloadedArticles([]);
    });
  }, [downloadedVersion]);

  const loadArticles = async (isRefreshing = false, customOffset?: number, customFilterType?: 'all' | 'articles' | 'recommandations', customAllowedGrades: string[] | null = allowedGrades) => {
    const currentFilterType = customFilterType ?? filterType;
    console.log('📰 [LES ARTICLES] Loading articles with params:', {
      discipline: selectedDiscipline,
      subDiscipline: selectedSubDiscipline,
      offset: customOffset ?? offset,
      allowedGrades: customAllowedGrades,
      filterByUserSubs: false, // TOUS les articles disponibles
      filterType: currentFilterType,
      onlyRecommendations: currentFilterType === 'recommandations'
    });

    const offsetToUse = isRefreshing ? 0 : (customOffset ?? offset);
    await dispatch(fetchArticles({
      discipline: selectedDiscipline,
      subDiscipline: selectedSubDiscipline === 'all' ? null : selectedSubDiscipline,
      offset: offsetToUse,
      refresh: isRefreshing,
      filterByUserSubs: false, // ✅ TOUS les articles disponibles
      onlyRecommendations: currentFilterType === 'recommandations', // ✅ Crucial pour les recommandations !
      allowedGrades: customAllowedGrades ?? undefined,
    })).unwrap();

    if (!isRefreshing) setOffset(offsetToUse + 10);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setHasLoadedOnce(false);
    await loadArticles(true, 0, filterType, allowedGrades);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingArticles && hasMoreArticles) {
      loadArticles(false, offset, filterType, allowedGrades);
    }
  };

  const handleOpenLink = async (link: string) => {
    try {
      await Linking.openURL(link);
    } catch (e) {
      console.error('Error opening link:', e);
    }
  };

  const handleLikePress = (article: Article) => {
    if (!user?.id) {
      return;
    }
    // Nouveau: vérifier si l'utilisateur est anonyme
    if (isAnonymous) {
      setGuestModalFeature('Likes');
      setShowGuestModal(true);
      return;
    }
    dispatch(toggleLike({ articleId: article.article_id, userId: user.id }));
  };

  const handleThumbsUpPress = (article: Article) => {
    if (!user?.id) {
      return;
    }
    // Nouveau: vérifier si l'utilisateur est anonyme
    if (isAnonymous) {
      setGuestModalFeature('Thumbs up');
      setShowGuestModal(true);
      return;
    }
    dispatch(toggleThumbsUp({ articleId: article.article_id, userId: user.id }));
  };

  const handleToggleDownload = async (article: Article) => {
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
      setDownloadedVersion(v => v + 1);
    } catch (e) {
      console.error('Erreur lors du toggle téléchargement', e);
    } finally {
      setDownloadLoadingIds(ids => ids.filter(id => id !== article.article_id));
    }
  };

  const handleGoToSettings = () => {
    setShowGuestModal(false);
    router.push('/profile');
  };

  const openArticleModal = (article: Article) => {
    setSelectedArticle(article);
    setModalVisible(true);
  };

  const closeArticleModal = () => {
    setModalVisible(false);
    setSelectedArticle(null);
  };

  const handleDisciplineChange = (newDisciplineName: string) => {
    dispatch(setSelectedDiscipline(newDisciplineName));
    if (newDisciplineName !== 'all') {
      const selectedDisciplineData = allDisciplines.find(d => d.name === newDisciplineName);
      if (selectedDisciplineData) {
        dispatch(fetchSubDisciplinesForFilter(selectedDisciplineData.id));
      }
    }
  };

  const handleSubDisciplineChange = (newSubDisciplineName: string | null) => dispatch(setSelectedSubDiscipline(newSubDisciplineName));
  const handleGradeChange = (newGrade: string | null) => {
    dispatch(setSelectedGrade(newGrade));
  };

  // Calculer subDisciplineFilterOptions une seule fois
  let subDisciplineFilterOptions: string[] = [];
  if (selectedDiscipline !== 'all') {
    subDisciplineFilterOptions = subDisciplinesForFilter.map(sd => sd.name);
  }

  if (errorArticles) {
    return (
      <View style={styles.container}>
        <TopHeader title="LES ARTICLES" />
        <FilterHeader
          disciplines={['all', ...allDisciplines.map(d => d.name)]}
          subDisciplines={subDisciplineFilterOptions.length > 0 ? ['all', ...subDisciplineFilterOptions] : []}
          selectedDiscipline={selectedDiscipline}
          selectedSubDiscipline={selectedSubDiscipline}
          onDisciplineChange={handleDisciplineChange}
          onSubDisciplineChange={handleSubDisciplineChange}
          selectedGrade={selectedGrade}
          onGradeChange={handleGradeChange}
          loadingSubDisciplines={false}
        />
        
        <ToggleFilter
          filterType={filterType}
          onFilterChange={setFilterType}
        />
        
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{errorArticles}</Text>
        </View>
      </View>
    );
  }

  // Loading stylé avec headers visibles
  const renderLoadingContent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.iconPrimary} />
      <Text style={styles.loadingText}>Chargement des articles...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TopHeader title="LES ARTICLES" />
      <FilterHeader
        disciplines={['all', ...allDisciplines.map(d => d.name)]}
        subDisciplines={subDisciplineFilterOptions.length > 0 ? ['all', ...subDisciplineFilterOptions] : []}
        selectedDiscipline={selectedDiscipline}
        selectedSubDiscipline={selectedSubDiscipline}
        onDisciplineChange={handleDisciplineChange}
        onSubDisciplineChange={handleSubDisciplineChange}
        selectedGrade={selectedGrade}
        onGradeChange={handleGradeChange}
        loadingSubDisciplines={false}
      />
      
      {/* Toggle filter */}
      <ToggleFilter
        filterType={filterType}
        onFilterChange={setFilterType}
      />
      
      {/* Contenu conditionnel : Loading stylé ou Liste */}
      {(loadingArticles && !refreshing && !hasLoadedOnce) ? renderLoadingContent() : (
        <FlashList
          data={listData}
          renderItem={({ item }: ListRenderItemInfo<ListItem>) => {
            if (typeof item === 'string') {
              // Header section
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{item}</Text>
                </View>
              );
            } else {
              // Article item
              return (
                <ArticleItem
                  article={item}
                  onPress={openArticleModal}
                  onLinkPress={handleOpenLink}
                  onLikePress={handleLikePress}
                  onThumbsUpPress={handleThumbsUpPress}
                  onToggleDownloadPress={handleToggleDownload}
                  isDownloaded={downloadedArticles.some((a: any) => a.article_id === (item as Article).article_id)}
                  isDownloadLoading={downloadLoadingIds.includes((item as Article).article_id)}
                />
              );
            }
          }}
          getItemType={(item: ListItem) => {
            if (typeof item === 'string') {
              return 'sectionHeader';
            }
            return 'row';
          }}
          stickyHeaderIndices={stickyHeaderIndices}
          estimatedItemSize={150}
          keyExtractor={(item) => {
            if (typeof item === 'string') {
              return item;
            }
            return (item as Article).article_id.toString();
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListFooterComponent={
            loadingArticles && !refreshing ? (
              <ActivityIndicator size="large" color={COLORS.iconPrimary} style={styles.loader} />
            ) : null
          }
          ListEmptyComponent={
            !loadingArticles && !refreshing && listData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun article trouvé</Text>
              </View>
            ) : null
          }
          extraData={downloadedVersion}
        />
      )}

      <ArticleModal visible={modalVisible} article={selectedArticle} onClose={closeArticleModal} />
      
      <GuestAccountModal
        visible={showGuestModal}
        feature={guestModalFeature}
        onClose={() => setShowGuestModal(false)}
        onGoToSettings={handleGoToSettings}
      />
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
    fontFamily: FONTS.sans.medium 
  } as TextStyle,
  loader: { 
    marginVertical: 20 
  } as ViewStyle,
  sectionHeader: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: 12,
    paddingHorizontal: 15,
  } as ViewStyle,
  sectionHeaderText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.bold,
    paddingVertical: 12,
    paddingHorizontal: 15, 
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    fontWeight: '600',
  } as TextStyle,
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
}); 
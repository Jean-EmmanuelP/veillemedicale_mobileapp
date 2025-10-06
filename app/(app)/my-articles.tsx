import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ViewStyle,
  TextStyle,
  RefreshControl,
  Linking,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchArticles,
  fetchUserSubscriptionStructure,
  fetchAllDisciplinesStructure,
  fetchSubDisciplinesForFilter,
  setSelectedDiscipline,
  setSelectedSubDiscipline,
  setSelectedGrade,
  toggleLike,
  toggleRead,
  toggleThumbsUp,
  clearMyArticles,
  resetFiltersToAll,
  type DisciplineStructure,
} from '../../store/articlesSlice';
import FilterHeader from '../../components/FilterHeader';
import ToggleFilter from '../../components/ToggleFilter';
import ArticleItem from '../../components/ArticleItem';
import ArticleModal from '../../components/ArticleModal';
import TopHeader from '../../components/TopHeader';
import { Article } from '../../types';
import { FONTS, FONT_SIZES } from '../../assets/constants/fonts';
import { COLORS } from '../../assets/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Define a union type for items in FlashList: string for headers, Article for items
type MyListItem = string | Article;

export default function MyArticlesScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const {
    myArticles,
    loadingMyArticles,
    errorMyArticles,
    hasMoreMyArticles,
    selectedDiscipline,
    selectedSubDiscipline,
    disciplines,
    allDisciplines,
    subDisciplinesForFilter,
    loadingSubDisciplinesForFilter,
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

  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const scrollDirection = useRef<'up' | 'down' | null>(null);

  const HEADER_HEIGHT = 300; // TopHeader + FilterHeader + ToggleFilter height

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const diff = currentScrollY - lastScrollY.current;

    // Ignore tiny scroll movements
    if (Math.abs(diff) < 3) {
      return;
    }

    const newDirection = diff > 0 ? 'down' : 'up';

    // Only animate if direction changed or we're past threshold
    if (newDirection === 'down' && currentScrollY > 100) {
      if (scrollDirection.current !== 'down') {
        scrollDirection.current = 'down';
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else if (newDirection === 'up' && diff < -50) {
      // Require stronger upward scroll to show header
      if (scrollDirection.current !== 'up') {
        scrollDirection.current = 'up';
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }

    lastScrollY.current = currentScrollY;
  }, [headerTranslateY, HEADER_HEIGHT]);

  const allowedGrades = useMemo(() => {
    if (!selectedGrade || selectedGrade === 'all') return null;
    return [selectedGrade];
  }, [selectedGrade]);

  // Prépare les données filtrées selon le toggle
  const filteredArticles = useMemo(() => {
    if (filterType === 'all') return myArticles;
    if (filterType === 'articles') return myArticles.filter(a => !a.is_recommandation);
    if (filterType === 'recommandations') return myArticles.filter(a => a.is_recommandation);
    return myArticles;
  }, [myArticles, filterType]);

  const listData = useMemo((): MyListItem[] => {
    const data: MyListItem[] = [];
    let articlesToList = [...filteredArticles];

    if (articlesToList.length > 0 && articlesToList[0].is_article_of_the_day) {
      data.push("🔥 Article du jour");
      data.push(articlesToList.shift()!); // Add the AOTD article
    }

    if (articlesToList.length > 0) {
      data.push("📖 Articles précédents");
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

  // Chargement des disciplines et articles au focus de la page
  useFocusEffect(
    useCallback(() => {
      // Charger les disciplines seulement si elles ne sont pas déjà chargées
      if (allDisciplines.length === 0) {
        dispatch(fetchAllDisciplinesStructure());
      }

      if (user?.id) {
        // Charger les disciplines auxquelles l'utilisateur est abonné
        dispatch(fetchUserSubscriptionStructure(user.id));

        AsyncStorage.getItem('downloadedArticles').then(data => {
          setDownloadedArticles(data ? JSON.parse(data) : []);
        });
      }
      return () => {};
    }, [dispatch, user?.id, allDisciplines.length])
  );

  useEffect(() => {
    setOffset(0);
    setHasLoadedOnce(false);
    setFilterType('all'); // Reset filter type when discipline/subdiscipline changes
  }, [selectedDiscipline, selectedSubDiscipline, allowedGrades]);

  // Charger automatiquement les sous-disciplines quand la discipline change
  useEffect(() => {
    if (selectedDiscipline !== 'all' && allDisciplines.length > 0) {
      const selectedDisciplineData = allDisciplines.find(d => d.name === selectedDiscipline);

      if (selectedDisciplineData) {
        dispatch(fetchSubDisciplinesForFilter(selectedDisciplineData.id));
      }
    }
  }, [selectedDiscipline, allDisciplines, dispatch]);

  useEffect(() => {
    // Reload articles when filter type changes
    if (hasLoadedOnce && user?.id) {
      setOffset(0);
      setHasLoadedOnce(false);
    }
  }, [filterType]);

  useEffect(() => {
    // Charger les articles pour les utilisateurs connectés
    if (!hasLoadedOnce && user?.id) {
      loadArticles(true, 0, filterType, allowedGrades).then(() => setHasLoadedOnce(true));
    }
  }, [hasLoadedOnce, filterType, selectedDiscipline, selectedSubDiscipline, allowedGrades, user?.id]);

  const loadArticles = async (isRefreshing = false, customOffset?: number, customFilterType?: typeof filterType, customAllowedGrades: string[] | null = allowedGrades) => {
    if (!user?.id) return;

    const currentFilter = customFilterType ?? filterType;
    const offsetToUse = isRefreshing ? 0 : (customOffset ?? offset);

    await dispatch(fetchArticles({
      discipline: selectedDiscipline,
      subDiscipline: selectedSubDiscipline === 'all' ? null : selectedSubDiscipline,
      offset: offsetToUse,
      refresh: isRefreshing,
      userId: user?.id,
      filterByUserSubs: true,
      onlyRecommendations: currentFilter === 'recommandations',
      allowedGrades: customAllowedGrades ?? undefined,
    })).unwrap();

    if (!isRefreshing) setOffset(offsetToUse + 10);
  };

  const handleDisciplineChange = async (newDisciplineName: string) => {
    // Le useEffect ci-dessus chargera automatiquement les sous-disciplines
    dispatch(setSelectedDiscipline(newDisciplineName));
  };

  const handleSubDisciplineChange = (newSubDisciplineName: string | null) => dispatch(setSelectedSubDiscipline(newSubDisciplineName));
  const handleGradeChange = (newGrade: string | null) => dispatch(setSelectedGrade(newGrade));
  const handleRefresh = async () => {
    if (!user?.id) return;

    setRefreshing(true);
    setHasLoadedOnce(false);
    await loadArticles(true, 0, filterType, allowedGrades);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!user?.id) return;

    if (!loadingMyArticles && hasMoreMyArticles) {
      loadArticles(false, offset, filterType, allowedGrades);
    }
  };
  const handleOpenLink = async (link: string) => { try { await Linking.openURL(link); } catch (e) { console.error('Error opening link:', e); } };
  const handleLikePress = (article: Article) => { 
    if (!user?.id) return; 
    dispatch(toggleLike({ articleId: article.article_id, userId: user.id })); 
  };
  const handleReadPress = (article: Article) => { 
    if (!user?.id) return; 
    // La lecture d'articles est autorisée même pour les utilisateurs anonymes (mais ils ne peuvent pas accéder à cette page)
    dispatch(toggleRead({ articleId: article.article_id, userId: user.id })); 
  };
  const handleThumbsUpPress = (article: Article) => { 
    if (!user?.id) return; 
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
      const refreshed = await AsyncStorage.getItem('downloadedArticles');
      setDownloadedArticles(refreshed ? [...JSON.parse(refreshed)] : []);
      setDownloadedVersion(v => v + 1);
    } catch (e) {
      console.error('Erreur lors du toggle téléchargement', e);
    } finally {
      setDownloadLoadingIds(ids => ids.filter(id => id !== article.article_id));
    }
  };
  const openArticleModal = (article: Article) => { setSelectedArticle(article); setModalVisible(true); };
  const closeArticleModal = () => { setModalVisible(false); setSelectedArticle(null); };

  // Calculer les options de filtres
  const disciplineFilterOptions = ['all', ...disciplines.map(d => d.name)];

  // Utiliser subDisciplinesForFilter du store pour la cohérence avec la page Articles
  const subDisciplineFilterOptions = useMemo(() => {
    if (selectedDiscipline === 'all') return [];
    return subDisciplinesForFilter.map(sd => sd.name);
  }, [selectedDiscipline, subDisciplinesForFilter]);

  // Loading stylé avec headers visibles
  const renderLoadingContent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.iconPrimary} />
      <Text style={styles.loadingText}>Chargement de vos articles...</Text>
    </View>
  );

  if (errorMyArticles) {
    return (
      <View style={styles.container}>
        <TopHeader title="Mes articles" />
        <FilterHeader
          disciplines={disciplineFilterOptions}
          subDisciplines={subDisciplineFilterOptions.length > 0 ? ['all', ...subDisciplineFilterOptions] : []}
          selectedDiscipline={selectedDiscipline}
          selectedSubDiscipline={selectedSubDiscipline}
          onDisciplineChange={handleDisciplineChange}
          onSubDisciplineChange={handleSubDisciplineChange}
          selectedGrade={selectedGrade}
          onGradeChange={handleGradeChange}
          loadingSubDisciplines={loadingSubDisciplinesForFilter}
        />
        
        <ToggleFilter
          filterType={filterType}
          onFilterChange={setFilterType}
        />
        
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{errorMyArticles}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedHeader,
          {
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
        pointerEvents="box-none"
      >
        <TopHeader title="Mes articles" />
        <FilterHeader
          disciplines={disciplineFilterOptions}
          subDisciplines={subDisciplineFilterOptions.length > 0 ? ['all', ...subDisciplineFilterOptions] : []}
          selectedDiscipline={selectedDiscipline}
          selectedSubDiscipline={selectedSubDiscipline}
          onDisciplineChange={handleDisciplineChange}
          onSubDisciplineChange={handleSubDisciplineChange}
          selectedGrade={selectedGrade}
          onGradeChange={handleGradeChange}
          loadingSubDisciplines={loadingSubDisciplinesForFilter}
        />

        {/* Toggle filter */}
        <ToggleFilter
          filterType={filterType}
          onFilterChange={setFilterType}
        />
      </Animated.View>
      
      {/* Contenu conditionnel : Loading stylé ou Liste */}
      {(loadingMyArticles && !refreshing && !hasLoadedOnce) ? renderLoadingContent() : (
        <FlashList
          data={listData}
          renderItem={({ item }: ListRenderItemInfo<MyListItem>) => {
            if (typeof item === 'string') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{item}</Text>
                </View>
              );
            } else {
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
          getItemType={(item: MyListItem) => typeof item === 'string' ? 'sectionHeader' : 'row'}
          stickyHeaderIndices={stickyHeaderIndices}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          estimatedItemSize={150}
          keyExtractor={(item) => typeof item === 'string' ? item : (item as Article).article_id.toString()}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListFooterComponent={loadingMyArticles && !refreshing ? <ActivityIndicator size="large" color={COLORS.iconPrimary} style={styles.loader} /> : null}
          ListEmptyComponent={!loadingMyArticles && !refreshing && myArticles.length === 0 ?
            <View style={styles.emptyContainer}><Text style={styles.emptyText}>Aucun article trouvé dans votre veille.</Text></View> : null}
          extraData={downloadedVersion}
        />
      )}

      <ArticleModal visible={modalVisible} article={selectedArticle} onClose={closeArticleModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary,
    overflow: 'hidden',
  } as ViewStyle,
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: COLORS.backgroundPrimary,
  } as ViewStyle,
  listContainer: {
    paddingTop: 300, // Space for animated header
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
    textTransform: 'capitalize',
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
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
  } as TextStyle,
}); 
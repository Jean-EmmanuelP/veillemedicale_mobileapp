import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  fetchArticles, 
  fetchUserSubscriptionStructure,
  setSelectedDiscipline,
  setSelectedSubDiscipline,
  toggleLike,
  toggleRead,
  toggleThumbsUp,
  clearMyArticles,
  resetFiltersToAll,
  type DisciplineStructure,
} from '../../store/articlesSlice';
import FilterHeader from '../../components/FilterHeader';
import ArticleItem from '../../components/ArticleItem';
import ArticleModal from '../../components/ArticleModal';
import { Article } from '../../types';
import { FONTS, FONT_SIZES } from '../../assets/constants/fonts';
import { COLORS } from '../../assets/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Define a union type for items in FlashList: string for headers, Article for items
type MyListItem = string | Article;

export default function MyArticlesScreen() {
  const dispatch = useAppDispatch();
  const { 
    myArticles,
    loadingMyArticles,
    errorMyArticles,
    hasMoreMyArticles,
    selectedDiscipline,
    selectedSubDiscipline,
    disciplines,
    selectedGrade,
  } = useAppSelector((state) => state.articles);
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'articles' | 'recommandations'>('all');
  const [offset, setOffset] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [downloadedArticles, setDownloadedArticles] = useState<any[]>([]);
  const [downloadLoadingIds, setDownloadLoadingIds] = useState<number[]>([]);
  const [downloadedVersion, setDownloadedVersion] = useState(0);

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

  useFocusEffect(
    useCallback(() => {
      if (user?.id) dispatch(fetchUserSubscriptionStructure(user.id));
      AsyncStorage.getItem('downloadedArticles').then(data => {
        setDownloadedArticles(data ? JSON.parse(data) : []);
      });
      return () => {};
    }, [dispatch, user?.id])
  );

  useEffect(() => {
    setOffset(0);
    setHasLoadedOnce(false);
  }, [filterType, selectedDiscipline, selectedSubDiscipline, allowedGrades]);

  useEffect(() => {
    if (!hasLoadedOnce && user?.id) {
      loadArticles(true, 0, filterType, allowedGrades).then(() => setHasLoadedOnce(true));
    }
  }, [hasLoadedOnce, filterType, selectedDiscipline, selectedSubDiscipline, allowedGrades, user?.id]);

  const loadArticles = async (isRefreshing = false, customOffset?: number, customFilterType?: typeof filterType, customAllowedGrades: string[] | null = allowedGrades) => {
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

  const handleDisciplineChange = (newDisciplineName: string) => dispatch(setSelectedDiscipline(newDisciplineName));
  const handleSubDisciplineChange = (newSubDisciplineName: string | null) => dispatch(setSelectedSubDiscipline(newSubDisciplineName));
  const handleRefresh = async () => {
    setRefreshing(true);
    setHasLoadedOnce(false);
    if (user?.id) await loadArticles(true);
    setRefreshing(false);
  };
  const handleLoadMore = () => {
    if (!loadingMyArticles && hasMoreMyArticles && user?.id) {
      loadArticles(false, offset, filterType, allowedGrades);
    }
  };
  const handleOpenLink = async (link: string) => { try { await Linking.openURL(link); } catch (e) { console.error('Error opening link:', e); } };
  const handleLikePress = (article: Article) => { if (!user?.id) return; dispatch(toggleLike({ articleId: article.article_id, userId: user.id })); };
  const handleReadPress = (article: Article) => { if (!user?.id) return; dispatch(toggleRead({ articleId: article.article_id, userId: user.id })); };
  const handleThumbsUpPress = (article: Article) => { if (!user?.id) return; dispatch(toggleThumbsUp({ articleId: article.article_id, userId: user.id })); };
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

  if (errorMyArticles) return <View style={styles.centerContainer}><Text style={styles.errorText}>{errorMyArticles}</Text></View>;

  const disciplineFilterOptions = ['all', ...disciplines.map(d => d.name)];
  let subDisciplineFilterOptions: string[] = [];
  if (selectedDiscipline !== 'all') {
    const currentActiveDiscipline = disciplines.find(d => d.name === selectedDiscipline);
    if (currentActiveDiscipline?.subscribed_sub_disciplines) {
      subDisciplineFilterOptions = currentActiveDiscipline.subscribed_sub_disciplines.map(sd => sd.name);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.fixedHeader}>
        <Text style={styles.fixedHeaderText}>Mes Articles</Text>
      </View>
      {/* Toggle filter */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
        <TouchableOpacity
          style={[styles.toggleButton, filterType === 'all' && styles.toggleButtonActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.toggleButtonText, filterType === 'all' && styles.toggleButtonTextActive]}>Tous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, filterType === 'articles' && styles.toggleButtonActive]}
          onPress={() => setFilterType('articles')}
        >
          <Text style={[styles.toggleButtonText, filterType === 'articles' && styles.toggleButtonTextActive]}>Articles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, filterType === 'recommandations' && styles.toggleButtonActive]}
          onPress={() => setFilterType('recommandations')}
        >
          <Text style={[styles.toggleButtonText, filterType === 'recommandations' && styles.toggleButtonTextActive]}>Recommandations</Text>
        </TouchableOpacity>
      </View>
      <FilterHeader
        disciplines={disciplineFilterOptions}
        subDisciplines={subDisciplineFilterOptions}
        selectedDiscipline={selectedDiscipline}
        selectedSubDiscipline={selectedSubDiscipline}
        selectedGrade={selectedGrade}
        onDisciplineChange={handleDisciplineChange}
        onSubDisciplineChange={handleSubDisciplineChange}
        onGradeChange={(newGrade) => {}}
        loadingSubDisciplines={false}
      />
      
      <FlashList
        data={listData}
        renderItem={({ item }: ListRenderItemInfo<MyListItem>) => {
          if (typeof item === 'string') {
            return <Text style={styles.sectionHeader}>{item}</Text>;
          } else {
            return (
              <ArticleItem
                article={item as Article}
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
        estimatedItemSize={150}
        keyExtractor={(item) => typeof item === 'string' ? item : (item as Article).article_id.toString()}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListFooterComponent={loadingMyArticles && !refreshing ? <ActivityIndicator size="large" color={COLORS.iconPrimary} style={styles.loader} /> : null}
        ListEmptyComponent={!loadingMyArticles && !refreshing && myArticles.length === 0 ?
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>Aucun article trouvé dans votre veille.</Text></View> : null}
        extraData={downloadedVersion}
      />

      <ArticleModal visible={modalVisible} article={selectedArticle} onClose={closeArticleModal} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.backgroundPrimary
  } as ViewStyle,
  fixedHeader: { 
    padding: 15, 
    paddingTop: Platform.OS === 'ios' ? 20 : 15, 
    backgroundColor: COLORS.headerBackground,
  } as ViewStyle,
  fixedHeaderText: { 
    fontSize: FONT_SIZES['2xl'],
    fontFamily: FONTS.sans.bold,
    textAlign: 'left',
    textTransform: 'uppercase',
    fontWeight: '700',
    color: COLORS.headerText,
  } as TextStyle,
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
  loader: { 
    padding: 20 
  } as ViewStyle,
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: COLORS.backgroundPrimary,
  } as ViewStyle,
  emptyText: { 
    fontSize: FONT_SIZES.base, 
    fontFamily: FONTS.sans.regular, 
    color: COLORS.textSecondary,
  } as TextStyle,
  sectionHeader: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.sans.bold,
    backgroundColor: COLORS.backgroundPrimary,
    paddingVertical: 12,
    paddingHorizontal: 15, 
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    fontWeight: '600',
  } as TextStyle,
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    marginHorizontal: 4,
    backgroundColor: COLORS.backgroundPrimary,
  },
  toggleButtonActive: {
    backgroundColor: '#FFF9C4', // Jaune pâle pour l'actif
    borderColor: '#FFD600',
  },
  toggleButtonText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  toggleButtonTextActive: {
    color: COLORS.textPrimary,
  },
}); 
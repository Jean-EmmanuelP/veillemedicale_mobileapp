import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ViewStyle,
  TextStyle,
  RefreshControl,
  Linking,
} from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  fetchArticles, 
  fetchAllDisciplinesStructure,
  setSelectedDiscipline,
  setSelectedSubDiscipline,
  setSelectedGrade,
  fetchSubDisciplinesForFilter,
  toggleLike,
  toggleRead,
  toggleThumbsUp,
  clearArticles,
  resetFiltersToAll,
} from '../../store/articlesSlice';
import FilterHeader from '../../components/FilterHeader';
import ArticleItem from '../../components/ArticleItem'
import ArticleModal from '../../components/ArticleModal';
import { Article } from '../../types';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../assets/constants/fonts';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../assets/constants/dimensions';
import { COLORS } from '../../assets/constants/colors';

// Define a union type for items in FlashList: string for headers, Article for items
type ListItem = string | Article;

export default function ArticlesScreen() {
  const dispatch = useAppDispatch();
  const { 
    items, 
    loadingItems,
    errorItems,
    hasMoreItems,
    selectedDiscipline, 
    selectedSubDiscipline,
    selectedGrade,
    allDisciplines,
    subDisciplinesForFilter,
    loadingSubDisciplinesForFilter,
  } = useAppSelector((state) => state.articles);
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Prepare data for FlashList (flattened with headers)
  const listData = useMemo((): ListItem[] => {
    const data: ListItem[] = [];
    let articlesToList = [...items];

    if (articlesToList.length > 0 && articlesToList[0].is_article_of_the_day) {
      data.push("🔥 Article du jour");
      data.push(articlesToList.shift()!); // Add the AOTD article
    }

    if (articlesToList.length > 0) {
      if (data.length > 0) { // If AOTD was added, then these are "previous"
        data.push("📖 Articles précédents");
      } // If no AOTD, the first header might implicitly be considered general, or add one if needed
      articlesToList.forEach(article => data.push(article));
    }
    return data;
  }, [items]);

  // Calculate sticky header indices for FlashList
  const stickyHeaderIndices = useMemo(() => 
    listData
      .map((item, index) => (typeof item === 'string' ? index : null))
      .filter(item => item !== null) as number[],
    [listData]
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(resetFiltersToAll());
      dispatch(fetchAllDisciplinesStructure());
      return () => {
        dispatch(clearArticles());
      };
    }, [dispatch])
  );

  useEffect(() => {
    const shouldLoad = 
      selectedDiscipline === 'all' || 
      (selectedDiscipline !== 'all' && selectedSubDiscipline !== null);

    if (shouldLoad && (selectedDiscipline === 'all' || allDisciplines.length > 0)) {
      loadArticles(true);
    }
  }, [selectedDiscipline, selectedSubDiscipline, allDisciplines.length, dispatch]);

  const loadArticles = async (isRefreshing = false) => {
    if (loadingItems && !isRefreshing) return;
    try {
      const currentOffset = isRefreshing ? 0 : items.length;
      await dispatch(fetchArticles({
        discipline: selectedDiscipline,
        subDiscipline: selectedSubDiscipline === 'all' ? null : selectedSubDiscipline,
        offset: currentOffset,
        refresh: isRefreshing,
        userId: user?.id,
        filterByUserSubs: false
      })).unwrap();
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArticles(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingItems && hasMoreItems) {
      loadArticles();
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
    dispatch(toggleLike({ articleId: article.article_id, userId: user.id }));
  };

  const handleReadPress = (article: Article) => {
    if (!user?.id) return;
    dispatch(toggleRead({ articleId: article.article_id, userId: user.id }));
  };

  const handleThumbsUpPress = (article: Article) => {
    if (!user?.id) {
      return;
    }
    dispatch(toggleThumbsUp({ articleId: article.article_id, userId: user.id }));
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
      const disciplineData = allDisciplines.find(d => d.name === newDisciplineName);
      if (disciplineData?.id) dispatch(fetchSubDisciplinesForFilter(disciplineData.id));
    }
  };

  const handleSubDisciplineChange = (newSubDisciplineName: string | null) => {
    dispatch(setSelectedSubDiscipline(newSubDisciplineName));
  };

  const handleGradeChange = (newGrade: string | null) => {
    dispatch(setSelectedGrade(newGrade));
  };

  if (errorItems) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorItems}</Text>
      </View>
    );
  }

  const disciplineOptions = ['all', ...(allDisciplines || []).map(d => d.name)];
  const subDisciplineOptions = selectedDiscipline !== 'all' && subDisciplinesForFilter.length > 0 
    ? ['all', ...subDisciplinesForFilter.map(sd => sd.name)] 
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.fixedHeader}>
        <Text style={styles.fixedHeaderText}>Les Articles</Text>
      </View>
      <FilterHeader
        disciplines={disciplineOptions}
        subDisciplines={subDisciplineOptions}
        selectedDiscipline={selectedDiscipline}
        selectedSubDiscipline={selectedSubDiscipline}
        selectedGrade={selectedGrade}
        onDisciplineChange={handleDisciplineChange}
        onSubDisciplineChange={handleSubDisciplineChange}
        onGradeChange={handleGradeChange}
        loadingSubDisciplines={loadingSubDisciplinesForFilter}
      />
      
      <FlashList
        data={listData}
        renderItem={({ item }: ListRenderItemInfo<ListItem>) => {
          if (typeof item === 'string') {
            // Render section header
            return <Text style={styles.sectionHeader}>{item}</Text>;
          } else {
            // Render article item
            return (
              <ArticleItem
                article={item as Article} // Cast item to Article
                onPress={openArticleModal}
                onLinkPress={handleOpenLink}
                onLikePress={handleLikePress}
                onThumbsUpPress={handleThumbsUpPress}
              />
            );
          }
        }}
        getItemType={(item: ListItem) => {
          return typeof item === 'string' ? 'sectionHeader' : 'row';
        }}
        stickyHeaderIndices={stickyHeaderIndices}
        estimatedItemSize={150} // Provide an estimated item size for FlashList performance
        keyExtractor={(item, index) => { // More robust key extractor
          if (typeof item === 'string') return item + index; // Header key
          return (item as Article).article_id.toString() + index; // Article key
        }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={
          loadingItems && !refreshing ? (
            <ActivityIndicator size="large" color={COLORS.iconPrimary} style={styles.loader} />
          ) : null
        }
        ListEmptyComponent={
          !loadingItems && !refreshing && listData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun article trouvé</Text>
            </View>
          ) : null
        }
      />

      <ArticleModal
        visible={modalVisible}
        article={selectedArticle}
        onClose={closeArticleModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary,
  } as ViewStyle,
  fixedHeader: { padding: 15, paddingTop: Platform.OS === 'ios' ? 20 : 15, backgroundColor: COLORS.headerBackground } as ViewStyle,
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
    fontFamily: FONTS.sans.regular,
  } as TextStyle,
  loader: {
    padding: 20,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalContent: {
    flex: 1,
    paddingTop: SCREEN_HEIGHT * 0.04,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  } as ViewStyle,
  closeButton: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.05,
    left: SCREEN_WIDTH * 0.03,
    zIndex: 1,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  } as ViewStyle,
  modalScroll: {
    padding: 24,
    paddingTop: 60,
  } as ViewStyle,
  modalTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontFamily: FONTS.serifDisplay.bold,
    marginBottom: 8,
    lineHeight: LINE_HEIGHTS['2xl'],
  } as TextStyle,
  modalJournal: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: '#666',
    marginBottom: 16,
  } as TextStyle,
  modalContentText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    lineHeight: LINE_HEIGHTS.base,
    color: '#333',
    marginBottom: 16,
  } as TextStyle,
  articleMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  } as ViewStyle,
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  } as ViewStyle,
  metaText: {
    marginLeft: 4,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: '#666',
  } as TextStyle,
  articleStats: {
    flexDirection: 'row',
    marginBottom: 12,
  } as ViewStyle,
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  } as ViewStyle,
  statText: {
    marginLeft: 4,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: '#666',
  } as TextStyle,
  articleLink: {
    color: '#007AFF',
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.bold,
    textDecorationLine: 'underline',
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
}); 
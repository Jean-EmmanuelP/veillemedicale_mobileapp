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
  } = useAppSelector((state) => state.articles);
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const listData = useMemo((): MyListItem[] => {
    const data: MyListItem[] = [];
    let articlesToList = [...myArticles]; // Use myArticles

    if (articlesToList.length > 0 && articlesToList[0].is_article_of_the_day) {
      data.push("🔥 Article du jour");
      data.push(articlesToList.shift()!); // Add the AOTD article
    }

    if (articlesToList.length > 0) {
      // If AOTD was added, or if it wasn't but there are still articles,
      // add the "previous articles" header.
      // Only add if there are actual articles for this section.
      data.push("📖 Articles précédents");
      articlesToList.forEach(article => data.push(article));
    }
    return data;
  }, [myArticles]);

  const stickyHeaderIndices = useMemo(() => 
    listData
      .map((item, index) => (typeof item === 'string' ? index : null))
      .filter(item => item !== null) as number[],
    [listData]
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(resetFiltersToAll());
      if (user?.id) dispatch(fetchUserSubscriptionStructure(user.id));
      return () => { /* dispatch(clearMyArticles()); // Handled by resetFiltersToAll */ };
    }, [dispatch, user?.id])
  );

  useEffect(() => {
    if (user?.id && disciplines.length === 0) dispatch(fetchUserSubscriptionStructure(user.id));
    const shouldLoad = selectedDiscipline === 'all' || (selectedDiscipline !== 'all' && selectedSubDiscipline !== null);
    if (user?.id && shouldLoad && (selectedDiscipline === 'all' || disciplines.length > 0)) {
      loadArticles(true);
    }
  }, [selectedDiscipline, selectedSubDiscipline, user?.id, disciplines.length, dispatch]);

  const loadArticles = async (isRefreshing = false) => {
    if (!user?.id || (loadingMyArticles && !isRefreshing)) return;
    try {
      const currentOffset = isRefreshing ? 0 : myArticles.length;
      await dispatch(fetchArticles({
        discipline: selectedDiscipline, 
        subDiscipline: selectedSubDiscipline === 'all' ? null : selectedSubDiscipline,
        offset: currentOffset, 
        refresh: isRefreshing,
        userId: user.id, 
        filterByUserSubs: true 
      })).unwrap();
    } catch (error) { console.error('Error loading my articles:', error); }
  };

  const handleDisciplineChange = (newDisciplineName: string) => dispatch(setSelectedDiscipline(newDisciplineName));
  const handleSubDisciplineChange = (newSubDisciplineName: string | null) => dispatch(setSelectedSubDiscipline(newSubDisciplineName));
  const handleRefresh = async () => { setRefreshing(true); if (user?.id) await loadArticles(true); setRefreshing(false); };
  const handleLoadMore = () => { if (!loadingMyArticles && hasMoreMyArticles && user?.id) loadArticles(); };
  const handleOpenLink = async (link: string) => { try { await Linking.openURL(link); } catch (e) { console.error('Error opening link:', e); } };
  const handleLikePress = (article: Article) => { if (!user?.id) return; dispatch(toggleLike({ articleId: article.article_id, userId: user.id })); };
  const handleReadPress = (article: Article) => { if (!user?.id) return; dispatch(toggleRead({ articleId: article.article_id, userId: user.id })); };
  const handleThumbsUpPress = (article: Article) => { if (!user?.id) return; dispatch(toggleThumbsUp({ articleId: article.article_id, userId: user.id })); };
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
      <FilterHeader
        disciplines={disciplineFilterOptions}
        subDisciplines={subDisciplineFilterOptions}
        selectedDiscipline={selectedDiscipline}
        selectedSubDiscipline={selectedSubDiscipline}
        selectedGrade={null}
        onDisciplineChange={handleDisciplineChange}
        onSubDisciplineChange={handleSubDisciplineChange}
        onGradeChange={() => {}}
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
              />
            );
          }
        }}
        getItemType={(item: MyListItem) => typeof item === 'string' ? 'sectionHeader' : 'row'}
        stickyHeaderIndices={stickyHeaderIndices}
        estimatedItemSize={150}
        keyExtractor={(item, index) => typeof item === 'string' ? item + index : (item as Article).article_id.toString() + index}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListFooterComponent={loadingMyArticles && !refreshing ? <ActivityIndicator size="large" color={COLORS.iconPrimary} style={styles.loader} /> : null}
        ListEmptyComponent={!loadingMyArticles && !refreshing && myArticles.length === 0 ?
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>Aucun article trouvé dans votre veille.</Text></View> : null}
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
}); 
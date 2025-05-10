import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, FlatList, Linking } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchArticles } from '../../store/articlesSlice';
import { Article } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export default function MyArticlesScreen() {
  const dispatch = useAppDispatch();
  const { items, loading, error, hasMore } = useAppSelector((state) => state.articles);
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadArticles(true);
  }, []);

  const loadArticles = async (isRefreshing = false) => {
    try {
      console.log('Loading my articles with params:', {
        offset: isRefreshing ? 0 : items.length,
        refresh: isRefreshing,
        filterByUserSubs: true,
        userId: user?.id
      });
      
      const result = await dispatch(fetchArticles({
        discipline: 'all',
        offset: isRefreshing ? 0 : items.length,
        refresh: isRefreshing,
        filterByUserSubs: true,
        userId: user?.id
      })).unwrap();
      
      console.log('My articles loaded:', result);
    } catch (error) {
      console.error('Error loading my articles:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArticles(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadArticles();
    }
  };

  const handleOpenLink = async (link: string) => {
    try {
      await Linking.openURL(link);
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const renderArticle = ({ item }: { item: Article }) => (
    <View style={styles.articleCard}>
      {item.is_article_of_the_day && (
        <View style={styles.aotdBadge}>
          <Text style={styles.aotdText}>Article du jour</Text>
        </View>
      )}
      <Text style={styles.articleTitle}>{item.title}</Text>
      <Text style={styles.articleJournal}>{item.journal}</Text>
      <View style={styles.articleMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.metaText}>
            {new Date(item.published_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="star-outline" size={16} color="#666" />
          <Text style={styles.metaText}>{item.grade}</Text>
        </View>
      </View>
      <View style={styles.articleStats}>
        <View style={styles.statItem}>
          <Ionicons name={item.is_liked ? "heart" : "heart-outline"} size={16} color={item.is_liked ? "#ff4444" : "#666"} />
          <Text style={styles.statText}>{item.like_count}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name={item.is_read ? "eye" : "eye-outline"} size={16} color={item.is_read ? "#007AFF" : "#666"} />
          <Text style={styles.statText}>{item.read_count}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name={item.is_thumbed_up ? "thumbs-up" : "thumbs-up-outline"} size={16} color={item.is_thumbed_up ? "#4CAF50" : "#666"} />
          <Text style={styles.statText}>{item.thumbs_up_count}</Text>
        </View>
      </View>
      {item.link && (
        <Text 
          style={styles.articleLink}
          onPress={() => handleOpenLink(item.link)}
        >
          Lire l'article
        </Text>
      )}
    </View>
  );

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderArticle}
        keyExtractor={(item) => item.article_id.toString()}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : null
        }
        ListEmptyComponent={
          !loading && !refreshing ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Vous n'avez pas encore d'articles</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  articleCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  aotdBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  aotdText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  articleJournal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  articleMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  articleStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  articleLink: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loader: {
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 
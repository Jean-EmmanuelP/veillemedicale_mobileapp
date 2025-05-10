import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, FlatList, Linking, Modal, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setSelectedDiscipline, fetchArticles } from '../../store/articlesSlice';
import { Picker } from '@react-native-picker/picker';
import { Article } from '../../types';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ArticlesScreen() {
  const dispatch = useAppDispatch();
  const { items, loading, error, hasMore, selectedDiscipline, disciplines } = useAppSelector((state) => state.articles);
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  useEffect(() => {
    console.log('Selected discipline changed:', selectedDiscipline);
    loadArticles(true);
  }, [selectedDiscipline]);

  const loadArticles = async (isRefreshing = false) => {
    try {
      console.log('Loading articles with params:', {
        discipline: selectedDiscipline,
        offset: isRefreshing ? 0 : items.length,
        refresh: isRefreshing,
        filterByUserSubs: false,
        userId: user?.id
      });
      
      const result = await dispatch(fetchArticles({
        discipline: selectedDiscipline,
        offset: isRefreshing ? 0 : items.length,
        refresh: isRefreshing,
        filterByUserSubs: false,
        userId: user?.id
      })).unwrap();
      
      console.log('Articles loaded:', result);
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

  const openArticleModal = (article: Article) => {
    setSelectedArticle(article);
    setModalVisible(true);
  };

  const closeArticleModal = () => {
    setModalVisible(false);
    setSelectedArticle(null);
  };

  const renderArticle = ({ item }: { item: Article }) => (
    <TouchableOpacity onPress={() => openArticleModal(item)} activeOpacity={0.8}>
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
    </TouchableOpacity>
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
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedDiscipline}
          onValueChange={(value) => dispatch(setSelectedDiscipline(value))}
          style={styles.picker}
        >
          {disciplines.map((discipline) => (
            <Picker.Item
              key={discipline}
              label={discipline.charAt(0).toUpperCase() + discipline.slice(1)}
              value={discipline}
            />
          ))}
        </Picker>
      </View>
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
              <Text style={styles.emptyText}>Aucun article trouvé</Text>
            </View>
          ) : null
        }
      />
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeArticleModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeArticleModal}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            {selectedArticle && (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <Text style={styles.modalTitle}>{selectedArticle.title}</Text>
                <Text style={styles.modalJournal}>{selectedArticle.journal}</Text>
                <View style={styles.articleMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.metaText}>
                      {new Date(selectedArticle.published_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="star-outline" size={16} color="#666" />
                    <Text style={styles.metaText}>{selectedArticle.grade}</Text>
                  </View>
                </View>
                <View style={styles.articleStats}>
                  <View style={styles.statItem}>
                    <Ionicons name={selectedArticle.is_liked ? "heart" : "heart-outline"} size={16} color={selectedArticle.is_liked ? "#ff4444" : "#666"} />
                    <Text style={styles.statText}>{selectedArticle.like_count}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name={selectedArticle.is_read ? "eye" : "eye-outline"} size={16} color={selectedArticle.is_read ? "#007AFF" : "#666"} />
                    <Text style={styles.statText}>{selectedArticle.read_count}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name={selectedArticle.is_thumbed_up ? "thumbs-up" : "thumbs-up-outline"} size={16} color={selectedArticle.is_thumbed_up ? "#4CAF50" : "#666"} />
                    <Text style={styles.statText}>{selectedArticle.thumbs_up_count}</Text>
                  </View>
                </View>
                <Text style={styles.modalContentText}>{selectedArticle.content}</Text>
                {selectedArticle.link && (
                  <Text 
                    style={styles.articleLink}
                    onPress={() => handleOpenLink(selectedArticle.link)}
                  >
                    Lire l'article original
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#fff',
  },
  pickerContainer: {
    height: SCREEN_HEIGHT * 0.2,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  picker: {
    height: 50,
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
    marginTop: 10,
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
  modalOverlay: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.94,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 2,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 30,
    textAlign: 'center',
  },
  modalJournal: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalScroll: {
    paddingBottom: 40,
  },
  modalContentText: {
    fontSize: 16,
    color: '#222',
    marginTop: 16,
    marginBottom: 16,
  },
}); 
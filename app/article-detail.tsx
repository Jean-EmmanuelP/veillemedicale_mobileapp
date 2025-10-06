import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { supabase } from '../lib/supabase';
import { Article } from '../types';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../assets/constants/fonts';
import { COLORS } from '../assets/constants/colors';
import * as Network from 'expo-network';
import { renderGradeStars } from '../utils/gradeStars';
import { useAppSelector } from '../store/hooks';

export default function ArticleDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ articleId: string }>();
  const { user } = useAppSelector((state) => state.auth);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Audio player state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [userScrolling, setUserScrolling] = useState(false);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (params.articleId) {
      loadArticle(parseInt(params.articleId));
    }
  }, [params.articleId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadArticle = async (articleId: number) => {
    try {
      setLoading(true);

      // Fetch article details from showed_articles
      const { data, error } = await supabase
        .from('showed_articles')
        .select('*')
        .eq('article_id', articleId)
        .single();

      if (error) throw error;

      // Get user-specific data if user is logged in
      let articleWithUserData = {
        ...data,
        is_liked: false,
        is_read: false,
        is_thumbed_up: false,
      };

      if (user?.id) {
        const [likeCheck, readCheck, thumbsUpCheck] = await Promise.all([
          supabase.from('article_likes').select('id').eq('article_id', articleId).eq('user_id', user.id).maybeSingle(),
          supabase.from('article_read').select('read_at').eq('article_id', articleId).eq('user_id', user.id).maybeSingle(),
          supabase.from('article_thumbs_up').select('thumbed_up_at').eq('article_id', articleId).eq('user_id', user.id).maybeSingle(),
        ]);

        articleWithUserData = {
          ...articleWithUserData,
          is_liked: !!likeCheck.data,
          is_read: !!readCheck.data,
          is_thumbed_up: !!thumbsUpCheck.data,
        };
      }

      setArticle(articleWithUserData as Article);
    } catch (error) {
      console.error('Error loading article:', error);
      Alert.alert('Erreur', "Impossible de charger l'article");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOriginalArticle = async () => {
    if (article && article.link) {
      const state = await Network.getNetworkStateAsync();
      if (!state.isConnected) {
        Alert.alert('Pas de connexion', 'Ouvre le lien plus tard, pas de connexion actuellement.');
        return;
      }
      setWebViewUrl(article.link);
      setShowWebView(true);
    }
  };

  const handleCloseWebView = () => {
    setShowWebView(false);
    setWebViewUrl(null);
  };

  // Audio player functions
  const loadAudio = async () => {
    if (!article?.audio_url) return;

    try {
      setIsLoadingAudio(true);
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: article.audio_url },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoadingAudio(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      Alert.alert('Erreur', "Impossible de charger l'audio");
      setIsLoadingAudio(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);

    // Auto-scroll based on audio progress
    if (status.isPlaying && !userScrolling && scrollRef.current) {
      const progress = status.positionMillis / (status.durationMillis || 1);
      const estimatedScrollHeight = 2000;
      const scrollPosition = progress * estimatedScrollHeight;

      scrollRef.current.scrollTo({ y: scrollPosition, animated: true });
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) {
      await loadAudio();
      return;
    }

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
          setUserScrolling(false);
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleUserScroll = () => {
    setUserScrolling(true);

    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
    }

    autoScrollTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setUserScrolling(false);
      }
    }, 3000);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('## ')) {
        return (
          <Text key={index} style={styles.contentHeading}>
            {line.substring(3)}
          </Text>
        );
      } else if (line.trim() === '') {
        return <View key={index} style={{ height: LINE_HEIGHTS.base / 2 }} />;
      } else {
        return (
          <Text key={index} style={styles.modalContentText}>
            {line}
          </Text>
        );
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.iconPrimary} />
          <Text style={styles.loadingText}>Chargement de l'article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!article) {
    return null;
  }

  if (showWebView && webViewUrl) {
    return (
      <SafeAreaView style={styles.webViewSafeArea}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity style={styles.webViewCloseButton} onPress={handleCloseWebView}>
            <MaterialIcons name="close" size={28} color={COLORS.iconPrimary} />
          </TouchableOpacity>
          <Text style={styles.webViewTitle} numberOfLines={1}>
            {article.journal}
          </Text>
        </View>
        <WebView
          source={{ uri: webViewUrl }}
          style={styles.webView}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={COLORS.iconPrimary} />
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.fullScreenSafeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <MaterialIcons name="keyboard-arrow-down" size={32} color={COLORS.iconPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={handleUserScroll}
          scrollEventThrottle={16}
        >
          <Text style={styles.modalTitle}>{article.title}</Text>
          <Text style={styles.modalJournal}>{article.journal}</Text>

          <View style={styles.articleMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.iconSecondary} />
              <Text style={styles.metaText}>
                {new Date(article.published_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.metaItem}>
              {renderGradeStars(article.grade, 16, true, { fontSize: 14, color: COLORS.textSecondary })}
            </View>
          </View>

          <View style={styles.articleStats}>
            <View style={styles.statItem}>
              <Ionicons
                name={article.is_liked ? 'heart' : 'heart-outline'}
                size={16}
                color={article.is_liked ? COLORS.iconPrimary : COLORS.iconSecondary}
              />
              <Text style={styles.statText}>{article.like_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name={article.is_read ? 'eye' : 'eye-outline'}
                size={16}
                color={article.is_read ? COLORS.iconPrimary : COLORS.iconSecondary}
              />
              <Text style={styles.statText}>{article.read_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name={article.is_thumbed_up ? 'thumbs-up' : 'thumbs-up-outline'}
                size={16}
                color={article.is_thumbed_up ? COLORS.iconPrimary : COLORS.iconSecondary}
              />
              <Text style={styles.statText}>{article.thumbs_up_count}</Text>
            </View>
          </View>

          {/* Audio Player */}
          {article.audio_url && (
            <View style={styles.audioPlayerContainer}>
              <View style={styles.audioPlayerContent}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlayPause}
                  disabled={isLoadingAudio}
                >
                  {isLoadingAudio ? (
                    <ActivityIndicator size="small" color={COLORS.textOnPrimaryButton} />
                  ) : (
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={28}
                      color={COLORS.textOnPrimaryButton}
                    />
                  )}
                </TouchableOpacity>

                <View style={styles.audioInfo}>
                  <View style={styles.audioTextRow}>
                    <Ionicons name="headset" size={16} color={COLORS.iconPrimary} />
                    <Text style={styles.audioLabel}>Écouter l'article</Text>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
                        ]}
                      />
                    </View>
                    <View style={styles.timeContainer}>
                      <Text style={styles.timeText}>{formatTime(position)}</Text>
                      <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>
                  </View>

                  {userScrolling && isPlaying && (
                    <View style={styles.scrollWarning}>
                      <Ionicons name="hand-left" size={12} color={COLORS.warning} />
                      <Text style={styles.scrollWarningText}>Défilement automatique pausé</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {renderContent(article.content)}

          {article.link && (
            <TouchableOpacity style={styles.originalArticleButton} onPress={handleOpenOriginalArticle}>
              <Text style={styles.originalArticleButtonText}>Lire l'article original</Text>
              <Ionicons name="arrow-forward-outline" size={20} color={COLORS.textOnPrimaryButton} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundModal,
  } as ViewStyle,
  fullScreenSafeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundModal,
  } as ViewStyle,
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
    paddingBottom: 10,
  } as ViewStyle,
  closeButton: {
    padding: 10,
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
  modalScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  } as ViewStyle,
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.serifDisplay.bold,
    marginBottom: 8,
    lineHeight: LINE_HEIGHTS.xl,
    color: COLORS.textPrimary,
  } as TextStyle,
  modalJournal: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
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
    color: COLORS.textSecondary,
  } as TextStyle,
  articleStats: {
    flexDirection: 'row',
    marginBottom: 16,
  } as ViewStyle,
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  } as ViewStyle,
  statText: {
    marginLeft: 5,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
  } as TextStyle,
  contentHeading: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  } as TextStyle,
  modalContentText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    lineHeight: LINE_HEIGHTS.base * 1.5,
    color: COLORS.textPrimary,
    marginBottom: 10,
  } as TextStyle,
  originalArticleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.buttonBackgroundPrimary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  originalArticleButtonText: {
    color: COLORS.buttonTextPrimary,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    marginRight: 8,
  },
  webViewSafeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundPrimary,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 12,
    backgroundColor: COLORS.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderPrimary,
  },
  webViewCloseButton: {
    padding: 5,
  },
  webViewTitle: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundPrimary,
  },
  audioPlayerContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginVertical: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  } as ViewStyle,
  audioPlayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.buttonBackgroundPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  } as ViewStyle,
  audioInfo: {
    flex: 1,
  } as ViewStyle,
  audioTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  audioLabel: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    marginLeft: 6,
  } as TextStyle,
  progressContainer: {
    width: '100%',
  } as ViewStyle,
  progressBar: {
    height: 4,
    backgroundColor: COLORS.borderPrimary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  } as ViewStyle,
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.iconPrimary,
    borderRadius: 2,
  } as ViewStyle,
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } as ViewStyle,
  timeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
  } as TextStyle,
  scrollWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.warningBackground,
    borderRadius: 4,
    alignSelf: 'flex-start',
  } as ViewStyle,
  scrollWarningText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.regular,
    color: COLORS.warning,
    marginLeft: 4,
  } as TextStyle,
});

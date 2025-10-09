import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  Platform,
  Animated,
  Dimensions,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { WebView } from 'react-native-webview';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Article } from "../types";
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from "../assets/constants/fonts";
import { SCREEN_WIDTH } from "../assets/constants/dimensions";
import { COLORS } from "../assets/constants/colors";
import * as Network from 'expo-network';
import { renderGradeStars } from '../utils/gradeStars';

interface ArticleModalProps {
  visible: boolean;
  article: Article | null;
  onClose: () => void;
  dispatch?: any;
  userId?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ArticleModal({
  visible,
  article,
  onClose,
}: ArticleModalProps) {
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Audio player state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [userScrolling, setUserScrolling] = useState(false);
  const [contentHeight, setContentHeight] = useState(2000);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPositionRef = useRef(0);

  // Cleanup audio on unmount or modal close
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, [sound]);

  useEffect(() => {
    if (!visible) {
      // Reset audio when modal closes
      if (sound) {
        sound.stopAsync();
        sound.unloadAsync();
        setSound(null);
      }
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      setUserScrolling(false);
      lastScrollPositionRef.current = 0;
    }
  }, [visible]);

  // Smooth auto-scroll effect
  useEffect(() => {
    if (isPlaying && !userScrolling && scrollRef.current && duration > 0) {
      // Clear any existing interval
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }

      // Update scroll position smoothly every 100ms
      scrollIntervalRef.current = setInterval(() => {
        if (scrollRef.current && duration > 0) {
          const progress = position / duration;
          const targetScrollPosition = Math.max(0, progress * contentHeight - 200);

          // Only scroll if there's a significant change
          if (Math.abs(targetScrollPosition - lastScrollPositionRef.current) > 1) {
            scrollRef.current.scrollTo({ y: targetScrollPosition, animated: true });
            lastScrollPositionRef.current = targetScrollPosition;
          }
        }
      }, 100);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isPlaying, userScrolling, position, duration, contentHeight]);

  // Debug: Log article data to check audio_url - AVANT le return
  useEffect(() => {
    if (article) {
      console.log('📄 [ArticleModal] Article data:', {
        id: article.article_id,
        title: article.title?.substring(0, 50),
        has_audio_url: !!article.audio_url,
        audio_url: article.audio_url,
      });
    }
  }, [article]);

  if (!article) return null;

  const handleOpenOriginalArticle = async () => {
    if (article && article.link) {
      const state = await Network.getNetworkStateAsync();
      if (!state.isConnected) {
        Alert.alert('Pas de connexion', 'Ouvre le lien plus tard, pas de connexion actuellement.');
        return;
      }
      setWebViewUrl(article.link);
      setShowWebView(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleCloseWebView = () => {
    Animated.timing(slideAnim, {
      toValue: screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowWebView(false);
      setWebViewUrl(null);
    });
  };

  // Audio player functions
  const loadAudio = async () => {
    if (!article.audio_url) return;

    try {
      setIsLoading(true);
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: article.audio_url },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoading(false);
      setUserScrolling(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      Alert.alert('Erreur', "Impossible de charger l'audio");
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);

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
          // Stop auto-scroll when paused
          setUserScrolling(true);
          if (autoScrollTimeoutRef.current) {
            clearTimeout(autoScrollTimeoutRef.current);
          }
        } else {
          await sound.playAsync();
          // Re-enable auto-scroll when playing
          setUserScrolling(false);
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const seekAudio = async (value: number) => {
    if (!sound) return;

    try {
      await sound.setPositionAsync(value);
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  };

  const handleUserScroll = () => {
    setUserScrolling(true);

    // Clear existing timeout
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
    }

    // Reset userScrolling after 2 seconds of no scrolling, only if playing
    autoScrollTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setUserScrolling(false);
      }
    }, 2000);
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
      // Titre principal (# avec emoji)
      if (line.startsWith('# ')) {
        return (
          <Text key={index} style={styles.mainHeading}>
            {line.substring(2)}
          </Text>
        );
      }
      // Sous-section (##)
      else if (line.startsWith('## ')) {
        return (
          <Text key={index} style={styles.contentHeading}>
            {line.substring(3)}
          </Text>
        );
      }
      // Sous-sous-section (###)
      else if (line.startsWith('### ')) {
        return (
          <Text key={index} style={styles.subHeading}>
            {line.substring(4)}
          </Text>
        );
      }
      // Liste à puces (-)
      else if (line.trim().startsWith('- ')) {
        const bulletContent = line.trim().substring(2);
        return (
          <View key={index} style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{bulletContent}</Text>
          </View>
        );
      }
      // Ligne vide
      else if (line.trim() === '') {
        return <View key={index} style={{ height: LINE_HEIGHTS.base / 2 }} />;
      }
      // Texte normal
      else {
        return (
          <Text key={index} style={styles.modalContentText}>
            {line}
          </Text>
        );
      }
    });
  };

  if (showWebView) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseWebView}
      >
        <SafeAreaView style={styles.webViewSafeArea}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity 
              style={styles.webViewCloseButton} 
              onPress={handleCloseWebView}
            >
              <MaterialIcons name="close" size={28} color={COLORS.iconPrimary} />
            </TouchableOpacity>
            <Text style={styles.webViewTitle} numberOfLines={1}>
              {article.journal}
            </Text>
          </View>
          <WebView 
            source={{ uri: article.link }} 
            style={styles.webView}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color={COLORS.iconPrimary} />
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContentContainer, showWebView && styles.hidden]}>
        <SafeAreaView style={styles.fullScreenSafeArea}>
          <View style={styles.headerBar}> 
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={32}
                color={COLORS.iconPrimary}
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={handleUserScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(width, height) => {
              setContentHeight(height);
            }}
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
                  name={article.is_liked ? "heart" : "heart-outline"}
                  size={16}
                  color={article.is_liked ? COLORS.iconPrimary : COLORS.iconSecondary}
                />
                <Text style={styles.statText}>{article.like_count}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons
                  name={article.is_read ? "eye" : "eye-outline"}
                  size={16}
                  color={article.is_read ? COLORS.iconPrimary : COLORS.iconSecondary}
                />
                <Text style={styles.statText}>{article.read_count}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons
                  name={
                    article.is_thumbed_up ? "thumbs-up" : "thumbs-up-outline"
                  }
                  size={16}
                  color={article.is_thumbed_up ? COLORS.iconPrimary : COLORS.iconSecondary}
                />
                <Text style={styles.statText}>{article.thumbs_up_count}</Text>
              </View>
            </View>

            {/* Audio Player */}
            {article.audio_url ? (
              <View style={styles.audioPlayerContainer}>
                <View style={styles.audioPlayerContent}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={togglePlayPause}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={COLORS.textOnPrimaryButton} />
                    ) : (
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
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
                            { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
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
            ) : (
              <View style={styles.noAudioContainer}>
                <Ionicons name="volume-mute-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.noAudioText}>Pas d'audio disponible pour cet article</Text>
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

      {showWebView && webViewUrl && (
        <Animated.View style={[styles.webViewContainer, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={styles.webViewSafeArea}> 
            <View style={styles.webViewHeader}>
              <TouchableOpacity onPress={handleCloseWebView} style={styles.webViewBackButton}>
                <Ionicons name="arrow-back" size={24} color={COLORS.iconPrimary} />
                <Text style={styles.webViewBackText}>Retour</Text>
              </TouchableOpacity>
            </View>
            <WebView source={{ uri: webViewUrl }} style={{ flex: 1 }} />
          </SafeAreaView>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContentContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundModal,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
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
  hidden: {
    opacity: 0,
  },
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
    flexDirection: "row",
    marginBottom: 12,
  } as ViewStyle,
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  } as ViewStyle,
  metaText: {
    marginLeft: 4,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
  } as TextStyle,
  articleStats: {
    flexDirection: "row",
    marginBottom: 16,
  } as ViewStyle,
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  } as ViewStyle,
  statText: {
    marginLeft: 5,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
  } as TextStyle,
  mainHeading: {
    fontSize: FONT_SIZES['lg'],
    fontFamily: FONTS.serifDisplay.bold,
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 16,
    lineHeight: LINE_HEIGHTS['lg'],
  } as TextStyle,
  contentHeading: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  } as TextStyle,
  subHeading: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  } as TextStyle,
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  } as ViewStyle,
  bullet: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    color: COLORS.iconPrimary,
    marginRight: 8,
    marginTop: 2,
  } as TextStyle,
  bulletText: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    lineHeight: LINE_HEIGHTS.base * 1.4,
    color: COLORS.textPrimary,
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
  webViewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: COLORS.backgroundPrimary,
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
  webViewBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  webViewBackText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textLink,
    marginLeft: 5,
  },
  // Audio Player Styles
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
  noAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    opacity: 0.6,
  } as ViewStyle,
  noAudioText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginLeft: 8,
  } as TextStyle,
});

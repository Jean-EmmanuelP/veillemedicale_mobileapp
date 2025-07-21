import React, { useState, useRef } from "react";
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
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Article } from '../types';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../assets/constants/fonts';
import { COLORS } from '../assets/constants/colors';
import { renderGradeStars } from '../utils/gradeStars';

interface ArticleItemProps {
  article: Article & { localUri?: string };
  onPress: (article: Article) => void;
  onLinkPress: (link: string) => void;
  onLikePress: (article: Article) => void;
  onThumbsUpPress: (article: Article) => void;
  onToggleDownloadPress?: (article: Article) => void;
  isDownloaded?: boolean;
  isDownloadLoading?: boolean;
}

export default function ArticleItem({
  article,
  onPress,
  onLikePress,
  onThumbsUpPress,
  onToggleDownloadPress,
  isDownloaded,
  isDownloadLoading,
}: ArticleItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, article.is_recommandation && styles.recommandationBackground]}
      onPress={() => onPress(article)}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{article.title}</Text>
        </View>

        <Text style={styles.journal}>{article.journal}</Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={COLORS.iconSecondary} />
            <Text style={styles.metaText}>
              {new Date(article.published_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaItem}>
            {renderGradeStars(article.grade, 14, true)}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, article.is_liked && styles.actionButtonActive]}
            onPress={() => onLikePress(article)}
          >
            <Ionicons
              name={article.is_liked ? "heart" : "heart-outline"}
              size={16}
              color={article.is_liked ? COLORS.iconPrimary : COLORS.iconSecondary}
            />
            <Text style={[styles.actionText, article.is_liked && styles.actionTextActive]}>
              {article.like_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, article.is_thumbed_up && styles.actionButtonActive]}
            onPress={() => onThumbsUpPress(article)}
          >
            <Ionicons
              name={article.is_thumbed_up ? "thumbs-up" : "thumbs-up-outline"}
              size={16}
              color={article.is_thumbed_up ? COLORS.iconPrimary : COLORS.iconSecondary}
            />
            <Text style={[styles.actionText, article.is_thumbed_up && styles.actionTextActive]}>
              {article.thumbs_up_count || 0}
            </Text>
          </TouchableOpacity>

          {onToggleDownloadPress && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onToggleDownloadPress(article)}
              disabled={isDownloadLoading}
            >
              {isDownloadLoading ? (
                <ActivityIndicator size={16} color={isDownloaded ? COLORS.iconPrimary : COLORS.iconSecondary} />
              ) : (
                <Ionicons name={isDownloaded ? "download" : "download-outline"} size={16} color={isDownloaded ? COLORS.iconPrimary : COLORS.iconSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundPrimary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  } as ViewStyle,
  content: {
    padding: 16,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  } as ViewStyle,
  title: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.serifDisplay.bold,
    lineHeight: LINE_HEIGHTS.lg,
    color: COLORS.textPrimary,
    marginRight: 8,
  } as TextStyle,
  journal: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
    marginBottom: 12,
  } as TextStyle,
  metaContainer: {
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
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  } as ViewStyle,
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 8,
  } as ViewStyle,
  actionButtonActive: {
    // Active state will be shown by icon and text color changes only
  } as ViewStyle,
  actionText: {
    marginLeft: 4,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.sans.regular,
    color: COLORS.textSecondary,
  } as TextStyle,
  actionTextActive: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.sans.bold,
  } as TextStyle,
  recommandationBackground: {
    backgroundColor: COLORS.backgroundSecondary, // Dark gray instead of bright yellow
    borderColor: COLORS.borderPrimary,
    borderWidth: 1,
  },
}); 
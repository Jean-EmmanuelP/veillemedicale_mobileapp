export interface Article {
  article_id: number;
  title: string;
  content: string;
  published_at: string;
  link: string;
  grade: string;
  journal: string;
  is_read: boolean;
  is_liked: boolean;
  like_count: number;
  read_count: number;
  is_thumbed_up: boolean;
  thumbs_up_count: number;
  is_article_of_the_day: boolean;
} 
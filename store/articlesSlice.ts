import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../lib/supabase';
import { Article } from '../types';
import { RootState } from '../store';

interface SubDisciplineInfo {
  id: number;
  name: string;
}

// This interface is used for both user's subscribed structure 
// and the list of all disciplines (where sub-discipline fields will be undefined).
export interface DisciplineStructure { 
  id: number;
  name: string;
  subscribed_sub_disciplines?: SubDisciplineInfo[]; 
  sub_disciplines?: SubDisciplineInfo[]; 
}

interface ArticlesState {
  items: Article[];
  loadingItems: boolean;
  errorItems: string | null;
  hasMoreItems: boolean;
  offsetItems: number;

  myArticles: Article[];
  loadingMyArticles: boolean;
  errorMyArticles: string | null;
  hasMoreMyArticles: boolean;
  offsetMyArticles: number;

  selectedDiscipline: string;
  selectedSubDiscipline: string | null;
  selectedGrade: string | null;
  
  disciplines: DisciplineStructure[]; // Holds user's subscribed discipline structure
  allDisciplines: DisciplineStructure[]; // Holds ALL disciplines from the system ({id, name})
  
  subDisciplinesForFilter: SubDisciplineInfo[]; // Sub-disciplines for the currently selected main discipline in general view
  loadingSubDisciplinesForFilter: boolean;
  errorSubDisciplinesForFilter: string | null;

  savedArticleIds: number[];

  likedArticles: Article[];
  loadingLikedArticles: boolean;
  errorLikedArticles: string | null;
}

const initialState: ArticlesState = {
  items: [],
  loadingItems: false,
  errorItems: null,
  hasMoreItems: true,
  offsetItems: 0,

  myArticles: [],
  loadingMyArticles: false,
  errorMyArticles: null,
  hasMoreMyArticles: true,
  offsetMyArticles: 0,

  selectedDiscipline: 'all',
  selectedSubDiscipline: null,
  selectedGrade: null,
  disciplines: [], // For user's subscribed structure
  allDisciplines: [], // For all disciplines {id, name}
  subDisciplinesForFilter: [],
  loadingSubDisciplinesForFilter: false,
  errorSubDisciplinesForFilter: null,
  savedArticleIds: [],

  likedArticles: [],
  loadingLikedArticles: false,
  errorLikedArticles: null,
};

// Fetches only disciplines/sub-disciplines user is subscribed to
export const fetchUserSubscriptionStructure = createAsyncThunk<DisciplineStructure[], string>(
  'articles/fetchUserSubscriptionStructure',
  async (userId: string) => {
    const { data, error } = await supabase.rpc(
      'get_user_subscription_structure_with_subs',
      { p_user_id: userId }
    );
    if (error) throw error;
    const structuredData = (data || []).sort((a: DisciplineStructure, b: DisciplineStructure) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    );
    structuredData.forEach((d: DisciplineStructure) => 
      d.subscribed_sub_disciplines?.sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
    );
    return structuredData as DisciplineStructure[];
  }
);

// Fetches ALL discipline names {id, name} from the system
export const fetchAllDisciplinesStructure = createAsyncThunk<DisciplineStructure[]>(
  'articles/fetchAllDisciplinesStructure',
  async () => {
    const { data, error } = await supabase
      .from('disciplines')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching all disciplines:', error);
      throw error;
    }
    return (data || []) as DisciplineStructure[]; // Cast to DisciplineStructure[] for consistency
  }
);

export const fetchSubDisciplinesForFilter = createAsyncThunk<
  SubDisciplineInfo[], 
  number, 
  { state: RootState } 
>(
  'articles/fetchSubDisciplinesForFilter',
  async (disciplineId, { rejectWithValue }) => {
    if (!disciplineId) {
      return []; 
    }
    try {
      const { data, error } = await supabase
        .from('sub_disciplines')
        .select('id, name')
        .eq('discipline_id', disciplineId) 
        .order('name', { ascending: true });
      if (error) {
        console.error('Error fetching sub-disciplines for filter:', error);
        throw rejectWithValue(error.message);
      }
      return data || [];
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchSavedArticles = createAsyncThunk<number[], string>(
  'articles/fetchSavedArticles',
  async (userId: string) => {
    const { data: savedArticlesData, error: savedArticlesError } = await supabase
      .from('saved_articles')
      .select('article_id')
      .eq('user_id', userId);

    if (savedArticlesError) throw savedArticlesError;

    const savedArticleIds = savedArticlesData?.map((saved) => saved.article_id) || [];
    return savedArticleIds;
  }
);

// Define a more specific return type for fetchArticles thunk payload
interface FetchArticlesPayload { // Ensure this interface is defined here
  data: Article[];
  refresh: boolean;
  filterByUserSubs: boolean;
  initialOffset: number;
}

export const fetchArticles = createAsyncThunk<
    FetchArticlesPayload, 
    { 
        discipline: string; 
        offset?: number; 
        refresh?: boolean; 
        filterByUserSubs?: boolean; 
        userId?: string | null; 
        searchTerm?: string | null; 
        subDiscipline?: string | null; 
        onlyRecommendations?: boolean;
        allowedGrades?: string[];
    }
>(
  'articles/fetchArticles',
  async (args) => {
    const rpcParams: any = {
      p_discipline_name: args.discipline === 'all' ? null : args.discipline,
      p_sub_discipline_name: args.subDiscipline,
      p_offset: args.offset ?? 0,
      p_user_id: args.userId ?? null,
      p_filter_by_user_subs: args.filterByUserSubs ?? false,
      p_search_term: args.searchTerm ?? null,
      p_only_recommendations: args.onlyRecommendations ?? false,
      p_allowed_grades: args.allowedGrades ?? null,
    };

    // Log parameters just before the RPC call
    // console.log('Calling get_all_articles_sub_disciplines with params:', JSON.stringify(rpcParams));

    const { data, error } = await supabase.rpc('get_all_articles_sub_disciplines', rpcParams);

    if (error) {
      console.error('Error loading articles from RPC:', JSON.stringify(error));
      throw error;
    }
    return { 
        data: data || [], 
        refresh: args.refresh || false, 
        filterByUserSubs: args.filterByUserSubs || false, 
        initialOffset: args.offset || 0 
    };
  }
);

export const toggleLike = createAsyncThunk(
  'articles/toggleLike',
  async ({ articleId, userId }: { articleId: number; userId: string }, { getState }) => {
    const state = getState() as RootState;

    // Vérifier si l'utilisateur est anonyme - ne pas faire d'appels DB
    if (state.auth.isAnonymous) {
      console.log('👤 [ARTICLES] toggleLike skipped for anonymous user');
      throw new Error('Anonymous users cannot like articles');
    }

    console.log('❤️ [ARTICLES] toggleLike for article:', articleId, 'user:', userId);

    const articleFromItems = state.articles.items.find(a => a.article_id === articleId);
    const articleFromMyArticles = state.articles.myArticles.find(a => a.article_id === articleId);
    const articleFromLiked = state.articles.likedArticles.find(a => a.article_id === articleId);
    const article = articleFromItems || articleFromMyArticles || articleFromLiked;
    if (!article) throw new Error('Article not found');
    let opError;
    if (article.is_liked) {
      const { error } = await supabase.from('article_likes').delete().eq('user_id', userId).eq('article_id', articleId);
      opError = error;
    } else {
      const { error } = await supabase.from('article_likes').insert({ article_id: articleId, user_id: userId });
      opError = error;
    }
    if (opError) { 
      console.error('❌ [ARTICLES] Toggle like error:', opError); 
      throw opError; 
    }
    const newLikeCount = article.is_liked ? article.like_count - 1 : article.like_count + 1;
    console.log('✅ [ARTICLES] Like toggled successfully');
    return { articleId, isLiked: !article.is_liked, likeCount: newLikeCount };
  }
);

export const toggleRead = createAsyncThunk(
  'articles/toggleRead',
  async ({ articleId, userId }: { articleId: number; userId: string }, { getState }) => {
    const state = getState() as RootState;

    // Vérifier si l'utilisateur est anonyme - ne pas faire d'appels DB
    if (state.auth.isAnonymous) {
      console.log('👤 [ARTICLES] toggleRead skipped for anonymous user');
      throw new Error('Anonymous users cannot mark articles as read');
    }

    console.log('📖 [ARTICLES] toggleRead for article:', articleId, 'user:', userId);

    const articleFromItems = state.articles.items.find(a => a.article_id === articleId);
    const articleFromMyArticles = state.articles.myArticles.find(a => a.article_id === articleId);
    const articleFromLiked = state.articles.likedArticles.find(a => a.article_id === articleId);
    const article = articleFromItems || articleFromMyArticles || articleFromLiked;
    if (!article) throw new Error('Article not found');
    let opError;
    if (article.is_read) {
      const { error } = await supabase.from('article_read').delete().eq('user_id', userId).eq('article_id', articleId);
      opError = error;
    } else {
      const { error } = await supabase.from('article_read').upsert({ article_id: articleId, user_id: userId }, { ignoreDuplicates: true });
      opError = error;
    }
    if (opError) { 
      console.error('❌ [ARTICLES] Toggle read error:', opError); 
      throw opError; 
    }
    const newReadCount = article.is_read ? article.read_count - 1 : article.read_count + 1;
    console.log('✅ [ARTICLES] Read status toggled successfully');
    return { articleId, isRead: !article.is_read, readCount: newReadCount };
  }
);

export const toggleThumbsUp = createAsyncThunk(
  'articles/toggleThumbsUp',
  async ({ articleId, userId }: { articleId: number; userId: string }, { getState }) => {
    const state = getState() as RootState;
    
    // Vérifier si l'utilisateur est anonyme - ne pas faire d'appels DB
    if (state.auth.isAnonymous) {
      console.log('👤 [ARTICLES] toggleThumbsUp skipped for anonymous user');
      throw new Error('Anonymous users cannot give thumbs up');
    }
    
    console.log('👍 [ARTICLES] toggleThumbsUp for article:', articleId, 'user:', userId);
    
    const articleFromItems = state.articles.items.find(a => a.article_id === articleId);
    const articleFromMyArticles = state.articles.myArticles.find(a => a.article_id === articleId);
    const articleFromLiked = state.articles.likedArticles.find(a => a.article_id === articleId);
    const article = articleFromItems || articleFromMyArticles || articleFromLiked;
    // Si pas d'article, on continue quand même (on a les ids)
    let opError;
    const isThumbedUp = article ? article.is_thumbed_up : false;
    if (isThumbedUp) {
      const { error } = await supabase.from('article_thumbs_up').delete().eq('user_id', userId).eq('article_id', articleId);
      opError = error;
    } else {
      const { error } = await supabase.from('article_thumbs_up').insert({ article_id: articleId, user_id: userId });
      opError = error;
    }
    if (opError) { 
      console.error('❌ [ARTICLES] Toggle thumbs up error:', opError); 
      throw opError; 
    }
    const newThumbsUpCount = article ? (isThumbedUp ? article.thumbs_up_count - 1 : article.thumbs_up_count + 1) : 0;
    console.log('✅ [ARTICLES] Thumbs up toggled successfully');
    return { articleId, isThumbedUp: !isThumbedUp, thumbsUpCount: newThumbsUpCount };
  }
);

export const fetchLikedArticles = createAsyncThunk<
  Article[],
  { userId: string; discipline?: string | null; subDiscipline?: string | null; offset?: number; searchTerm?: string | null; onlyRecommendations?: boolean },
  { state: RootState }
>(
  'articles/fetchLikedArticles',
  async ({ userId, discipline = null, subDiscipline = null, offset = 0, searchTerm = null, onlyRecommendations = false }, { getState }) => {
    const state = getState();
    
    // Vérifier si l'utilisateur est anonyme - ne pas faire d'appels DB
    if (state.auth.isAnonymous) {
      console.log('👤 [ARTICLES] fetchLikedArticles skipped for anonymous user');
      throw new Error('Anonymous users do not have liked articles');
    }
    
    console.log('❤️ [ARTICLES] fetchLikedArticles for user:', userId);
    
    const { data, error } = await supabase.rpc('get_user_liked_articles', {
      p_user_id: userId,
      p_discipline_name: discipline,
      p_sub_discipline_name: subDiscipline,
      p_search_term: searchTerm,
      p_only_recommendations: onlyRecommendations,
      p_offset: offset,
    });
    if (error) {
      console.error('❌ [ARTICLES] fetchLikedArticles error:', error);
      throw error;
    }
    console.log('✅ [ARTICLES] fetchLikedArticles completed, found:', data?.length || 0, 'articles');
    return data || [];
  }
);

const articlesSlice = createSlice({
  name: 'articles',
  initialState,
  reducers: {
    setSelectedDiscipline: (state, action: PayloadAction<string>) => {
      const newSelectedDisciplineName = action.payload;
      if (state.selectedDiscipline !== newSelectedDisciplineName) {
        state.selectedDiscipline = newSelectedDisciplineName;
        state.selectedSubDiscipline = null;
        state.selectedGrade = null;
        state.subDisciplinesForFilter = [];
        state.loadingSubDisciplinesForFilter = newSelectedDisciplineName !== 'all';
        state.errorSubDisciplinesForFilter = null;
        state.items = [];
        state.offsetItems = 0;
        state.hasMoreItems = true;
        state.errorItems = null;
        state.myArticles = [];
        state.offsetMyArticles = 0;
        state.hasMoreMyArticles = true;
        state.errorMyArticles = null;
      }
    },
    setSelectedSubDiscipline: (state, action: PayloadAction<string | null>) => {
      if (state.selectedSubDiscipline !== action.payload) {
        state.selectedSubDiscipline = action.payload;
        state.selectedGrade = null;
        state.items = [];
        state.offsetItems = 0;
        state.hasMoreItems = true;
        state.errorItems = null;
        state.myArticles = [];
        state.offsetMyArticles = 0;
        state.hasMoreMyArticles = true;
        state.errorMyArticles = null;
      }
    },
    setSelectedGrade: (state, action: PayloadAction<string | null>) => {
      state.selectedGrade = action.payload;
    },
    resetFiltersToAll: (state) => {
      state.selectedDiscipline = 'all';
      state.selectedSubDiscipline = null;
      state.selectedGrade = null;
      state.items = [];
      state.offsetItems = 0;
      state.hasMoreItems = true;
      state.errorItems = null; 
      state.myArticles = [];
      state.offsetMyArticles = 0;
      state.hasMoreMyArticles = true;
      state.errorMyArticles = null;
      state.subDisciplinesForFilter = [];
      state.loadingSubDisciplinesForFilter = false;
      state.errorSubDisciplinesForFilter = null;
    },
    clearArticles: (state) => {
      state.items = [];
      state.offsetItems = 0;
      state.hasMoreItems = true;
      state.errorItems = null;
    },
    clearMyArticles: (state) => {
      state.myArticles = [];
      state.offsetMyArticles = 0;
      state.hasMoreMyArticles = true;
      state.errorMyArticles = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserSubscriptionStructure.fulfilled, (state, action) => {
        state.disciplines = action.payload; // Populates user's subscribed disciplines
      })
      .addCase(fetchAllDisciplinesStructure.fulfilled, (state, action) => {
        // action.payload is an array of {id, name}. 
        // This is compatible with DisciplineStructure[] as sub-fields are optional.
        state.allDisciplines = action.payload; 
      })
      .addCase(fetchSubDisciplinesForFilter.pending, (state) => {
        state.loadingSubDisciplinesForFilter = true;
        state.errorSubDisciplinesForFilter = null;
        state.subDisciplinesForFilter = []; // Clear previous on new fetch
      })
      .addCase(fetchSubDisciplinesForFilter.fulfilled, (state, action) => {
        state.loadingSubDisciplinesForFilter = false;
        state.subDisciplinesForFilter = action.payload;
      })
      .addCase(fetchSubDisciplinesForFilter.rejected, (state, action) => {
        state.loadingSubDisciplinesForFilter = false;
        state.errorSubDisciplinesForFilter = action.error.message || 'Failed to load sub-disciplines';
      })
      .addCase(fetchSavedArticles.fulfilled, (state, action) => {
        state.savedArticleIds = action.payload;
      })
      .addCase(fetchArticles.pending, (state, action) => {
        const { filterByUserSubs } = action.meta.arg;
        if (filterByUserSubs) {
          state.loadingMyArticles = true;
          state.errorMyArticles = null;
        } else {
          state.loadingItems = true;
          state.errorItems = null;
        }
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        const { data, refresh, filterByUserSubs, initialOffset } = action.payload;
        const itemsKey = filterByUserSubs ? 'myArticles' : 'items';
        const loadingKey = filterByUserSubs ? 'loadingMyArticles' : 'loadingItems';
        const offsetKey = filterByUserSubs ? 'offsetMyArticles' : 'offsetItems';
        const hasMoreKey = filterByUserSubs ? 'hasMoreMyArticles' : 'hasMoreItems';

        state[loadingKey] = false;
        if (!data || data.length === 0) {
          state[hasMoreKey] = false;
          if (refresh || initialOffset === 0) { state[itemsKey] = []; }
        } else {
          if (refresh || initialOffset === 0) { state[itemsKey] = data; }
          else { state[itemsKey] = [...state[itemsKey], ...data]; }
          state[offsetKey] = state[itemsKey].length;
          state[hasMoreKey] = true;
        }
      })
      .addCase(fetchArticles.rejected, (state, action) => {
        const { filterByUserSubs } = action.meta.arg;
        if (filterByUserSubs) {
          state.loadingMyArticles = false;
          state.errorMyArticles = action.error.message || 'Une erreur est survenue';
        } else {
          state.loadingItems = false;
          state.errorItems = action.error.message || 'Une erreur est survenue';
        }
      })
      .addCase(toggleLike.fulfilled, (state, action: PayloadAction<{articleId: number; isLiked: boolean; likeCount: number} | undefined>) => {
        if (!action.payload) return;
        const { articleId, isLiked, likeCount } = action.payload;
        const update = (a: Article) => a.article_id === articleId ? { ...a, is_liked: isLiked, like_count: likeCount } : a;
        state.items = state.items.map(update);
        state.myArticles = state.myArticles.map(update);
        state.likedArticles = state.likedArticles.map(update);
      })
      .addCase(toggleLike.rejected, (state, action) => {
        // Ne pas afficher l'erreur pour les utilisateurs anonymes
        const errorMessage = action.error.message || '';
        if (errorMessage.includes('Anonymous users cannot like articles')) {
          console.log('🔇 [ARTICLES] toggleLike.rejected: Suppressing error for anonymous user');
        } else {
          console.error('❌ [ARTICLES] toggleLike.rejected:', errorMessage);
        }
      })
      .addCase(toggleRead.fulfilled, (state, action: PayloadAction<{articleId: number; isRead: boolean; readCount: number} | undefined>) => {
        if (!action.payload) return;
        const { articleId, isRead, readCount } = action.payload;
        const update = (a: Article) => a.article_id === articleId ? { ...a, is_read: isRead, read_count: readCount } : a;
        state.items = state.items.map(update);
        state.myArticles = state.myArticles.map(update);
      })
      .addCase(toggleThumbsUp.fulfilled, (state, action: PayloadAction<{articleId: number; isThumbedUp: boolean; thumbsUpCount: number} | undefined>) => {
        if (!action.payload) return;
        const { articleId, isThumbedUp, thumbsUpCount } = action.payload;
        const update = (a: Article) => a.article_id === articleId ? { ...a, is_thumbed_up: isThumbedUp, thumbs_up_count: thumbsUpCount } : a;
        state.items = state.items.map(update);
        state.myArticles = state.myArticles.map(update);
        state.likedArticles = state.likedArticles.map(update);
      })
      .addCase(toggleThumbsUp.rejected, (state, action) => {
        // Ne pas afficher l'erreur pour les utilisateurs anonymes
        const errorMessage = action.error.message || '';
        if (errorMessage.includes('Anonymous users cannot give thumbs up')) {
          console.log('🔇 [ARTICLES] toggleThumbsUp.rejected: Suppressing error for anonymous user');
        } else {
          console.error('❌ [ARTICLES] toggleThumbsUp.rejected:', errorMessage);
        }
      })
      .addCase(fetchLikedArticles.pending, (state) => {
        state.loadingLikedArticles = true;
        state.errorLikedArticles = null;
        console.log('⏳ [ARTICLES] fetchLikedArticles.pending: Loading liked articles...');
      })
      .addCase(fetchLikedArticles.fulfilled, (state, action) => {
        state.loadingLikedArticles = false;
        state.likedArticles = action.payload;
        console.log('✅ [ARTICLES] fetchLikedArticles.fulfilled: Loaded', action.payload.length, 'liked articles');
      })
      .addCase(fetchLikedArticles.rejected, (state, action) => {
        state.loadingLikedArticles = false;
        
        // Ne pas afficher l'erreur pour les utilisateurs anonymes
        const errorMessage = action.error.message || '';
        if (errorMessage.includes('Anonymous users do not have liked articles')) {
          console.log('🔇 [ARTICLES] fetchLikedArticles.rejected: Suppressing error for anonymous user');
          state.errorLikedArticles = null;
        } else {
          console.error('❌ [ARTICLES] fetchLikedArticles.rejected:', errorMessage);
          state.errorLikedArticles = errorMessage || 'Une erreur est survenue';
        }
      });
  },
});

export const { 
  setSelectedDiscipline, 
  setSelectedSubDiscipline, 
  setSelectedGrade,
  resetFiltersToAll,
  clearArticles, 
  clearMyArticles
} = articlesSlice.actions;

// Thunks are already exported by virtue of using `export const` 
// so no need for the explicit export block that was causing issues.

export default articlesSlice.reducer; 
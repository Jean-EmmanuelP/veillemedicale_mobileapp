import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { convex, api } from '../lib/convex';
import { Article } from '../types';
import { RootState } from '../store';

// Toutes les lectures/écritures passent par Convex. L'utilisateur est celui de la
// session Convex Auth (JWT) : aucun `userId` n'est envoyé au serveur.

function findArticle(state: RootState, articleId: number): Article | undefined {
  return (
    state.articles.items.find(a => a.article_id === articleId) ||
    state.articles.myArticles.find(a => a.article_id === articleId) ||
    state.articles.likedArticles.find(a => a.article_id === articleId)
  );
}

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
export const fetchUserSubscriptionStructure = createAsyncThunk<DisciplineStructure[], string | undefined>(
  'articles/fetchUserSubscriptionStructure',
  async () => {
    const rows: any = await convex.query(api.articles.getUserSubscriptionStructureFor, {});
    return (Array.isArray(rows) ? rows : []) as DisciplineStructure[];
  }
);

// Fetches ALL discipline names {id, name} from the system
export const fetchAllDisciplinesStructure = createAsyncThunk<DisciplineStructure[], void, { state: RootState }>(
  'articles/fetchAllDisciplinesStructure',
  async (_, { getState }) => {
    const state = getState();
    // Si les disciplines sont déjà chargées, ne pas refaire l'appel
    if (state.articles.allDisciplines.length > 0) {
      return state.articles.allDisciplines;
    }

    const rows: any = await convex.query(api.articles.getDisciplineMap, {});
    return (rows ?? [])
      .slice()
      .sort((a: any, b: any) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })) as DisciplineStructure[];
  }
);

export const fetchSubDisciplinesForFilter = createAsyncThunk<
  SubDisciplineInfo[],
  number,
  { state: RootState }
>(
  'articles/fetchSubDisciplinesForFilter',
  async (disciplineId, { rejectWithValue }) => {
    if (!disciplineId) return [];

    try {
      const rows: any = await convex.query(api.articles.getSubDisciplinesById, { disciplineId });
      return (Array.isArray(rows) ? rows : []) as SubDisciplineInfo[];
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchSavedArticles = createAsyncThunk<number[], string | undefined>(
  'articles/fetchSavedArticles',
  async () => {
    const ids: any = await convex.query(api.interactions.getSavedArticlesFor, {});
    return (Array.isArray(ids) ? ids : []) as number[];
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
        searchTerm?: string | null; 
        subDiscipline?: string | null; 
        onlyRecommendations?: boolean;
        allowedGrades?: string[];
    }
>(
  'articles/fetchArticles',
  async (args) => {
    const res: any = await convex.query(api.articles.getArticlesFeed, {
      disciplineName: args.discipline === 'all' ? undefined : args.discipline,
      subDisciplineName: args.subDiscipline ?? undefined,
      offset: args.offset ?? 0,
      filterByUserSubs: args.filterByUserSubs ?? false,
      search: args.searchTerm ?? undefined,
      onlyRecommandations: args.onlyRecommendations ?? false,
    });
    const rows: any[] = res?.data ?? [];
    return {
        data: rows,
        refresh: args.refresh || false,
        filterByUserSubs: args.filterByUserSubs || false,
        initialOffset: args.offset || 0
    };
  }
);

export const toggleLike = createAsyncThunk(
  'articles/toggleLike',
  async ({ articleId }: { articleId: number }, { getState }) => {
    const article = findArticle(getState() as RootState, articleId);
    if (!article) throw new Error('Article not found');

    await convex.mutation(api.interactions.setLikeFor, { articleId, liked: !article.is_liked });

    const newLikeCount = article.is_liked ? article.like_count - 1 : article.like_count + 1;
    return { articleId, isLiked: !article.is_liked, likeCount: newLikeCount };
  }
);

export const toggleRead = createAsyncThunk(
  'articles/toggleRead',
  async ({ articleId }: { articleId: number }, { getState }) => {
    const article = findArticle(getState() as RootState, articleId);
    if (!article) throw new Error('Article not found');

    await convex.mutation(api.interactions.setReadFor, { articleId, read: !article.is_read });

    const newReadCount = article.is_read ? article.read_count - 1 : article.read_count + 1;
    return { articleId, isRead: !article.is_read, readCount: newReadCount };
  }
);

export const toggleThumbsUp = createAsyncThunk(
  'articles/toggleThumbsUp',
  async ({ articleId }: { articleId: number }, { getState }) => {
    const article = findArticle(getState() as RootState, articleId);
    const isThumbedUp = article ? article.is_thumbed_up : false;

    await convex.mutation(api.interactions.setThumbsUpFor, { articleId, thumbedUp: !isThumbedUp });

    const newThumbsUpCount = article ? (isThumbedUp ? article.thumbs_up_count - 1 : article.thumbs_up_count + 1) : 0;
    return { articleId, isThumbedUp: !isThumbedUp, thumbsUpCount: newThumbsUpCount };
  }
);

export const fetchLikedArticles = createAsyncThunk<
  Article[],
  { discipline?: string | null; subDiscipline?: string | null; offset?: number; searchTerm?: string | null; onlyRecommendations?: boolean },
  { state: RootState }
>(
  'articles/fetchLikedArticles',
  async ({ discipline = null, subDiscipline = null, offset = 0, searchTerm = null, onlyRecommendations = false }) => {
    const res: any = await convex.query(api.articles.getLikedFeed, {
      disciplineName: discipline ?? undefined,
      subDisciplineName: subDiscipline ?? undefined,
      search: searchTerm ?? undefined,
      onlyRecommandations: onlyRecommendations,
      offset,
    });
    return (res?.data ?? []) as Article[];
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
        // Ne PAS activer loadingSubDisciplinesForFilter ici - cela sera fait dans fetchSubDisciplinesForFilter.pending
        // Le composant appellera explicitement fetchSubDisciplinesForFilter après ce dispatch
        if (newSelectedDisciplineName === 'all') {
          // Si 'all' est sélectionné, vider les sous-disciplines immédiatement
          state.subDisciplinesForFilter = [];
          state.loadingSubDisciplinesForFilter = false;
        }
        // Sinon, garder les anciennes sous-disciplines jusqu'au prochain fetch
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
      // Vider les sous-disciplines quand on reset à 'all' car elles ne sont pas applicables
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
        state.subDisciplinesForFilter = [];
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
        // Silently ignore errors for anonymous users
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
        // Silently ignore errors for anonymous users
      })
      .addCase(fetchLikedArticles.pending, (state) => {
        state.loadingLikedArticles = true;
        state.errorLikedArticles = null;
      })
      .addCase(fetchLikedArticles.fulfilled, (state, action) => {
        state.loadingLikedArticles = false;
        state.likedArticles = action.payload;
      })
      .addCase(fetchLikedArticles.rejected, (state, action) => {
        state.loadingLikedArticles = false;
        const errorMessage = action.error.message || '';
        if (!errorMessage.includes('Anonymous users do not have liked articles')) {
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
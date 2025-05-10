import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../lib/supabase';

interface Article {
  id: string;
  title: string;
  content: string;
  discipline: string;
  created_at: string;
  author_id: string;
  updated_at: string;
}

interface ArticlesState {
  items: Article[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  offset: number;
  selectedDiscipline: string;
  disciplines: string[];
}

const initialState: ArticlesState = {
  items: [],
  loading: false,
  error: null,
  hasMore: true,
  offset: 0,
  selectedDiscipline: 'all',
  disciplines: ['all', 'Allergie et immunologie', 'Anesthésie - Réanimation', 'Cardiologie',
	  'Chirurgie cardiaque', 'Chirurgie digestive', 'Chirurgie ORL',
	  'Chirurgie orthopédique', 'Chirurgie plastique', 'Chirurgie thoracique',
	  'Chirurgie vasculaire', 'Dermatologie', 'Endocrinologie-Diabétologie-Nutrition',
	  'Génétique', 'Gériatrie', 'Gynécologie-obstétrique', 'Hématologie',
	  'Hépato-Gastroentérologie', 'Maladies infectieuses', 'Médecine de la douleur',
	  'Médecine du Travail', 'Médecine Générale', 'Médecine Interne',
	  'Médecine physique et réadaptation', 'Néphrologie', 'Neurochirurgie',
	  'Neurologie', 'Oncologie', 'Ophtalmologie', 'Pédiatrie', 'Pneumologie',
	  'Psychiatrie', 'Rhumatologie', 'Santé Publique', 'Urgences', 'Urologie'],
};

export const fetchArticles = createAsyncThunk(
  'articles/fetchArticles',
  async ({ 
    discipline, 
    offset = 0, 
    refresh = false,
    filterByUserSubs = false,
    userId = null,
    searchTerm = null,
    subDiscipline = null
  }: { 
    discipline: string; 
    offset?: number;
    refresh?: boolean;
    filterByUserSubs?: boolean;
    userId?: string | null;
    searchTerm?: string | null;
    subDiscipline?: string | null;
  }, { getState }) => {
    console.log('Fetching articles with params:', { 
      discipline, 
      offset, 
      refresh, 
      filterByUserSubs,
      userId,
      searchTerm,
      subDiscipline
    });
    
    const { data, error } = await supabase.rpc('get_all_articles_sub_disciplines', {
      p_discipline_name: discipline === 'all' ? null : discipline,
      p_sub_discipline_name: subDiscipline,
      p_offset: offset,
      p_search_term: searchTerm,
      p_user_id: userId,
      p_filter_by_user_subs: filterByUserSubs
    });
    
    console.log('Supabase response:', { data, error });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    return { data, refresh };
  }
);

const articlesSlice = createSlice({
  name: 'articles',
  initialState,
  reducers: {
    setSelectedDiscipline: (state, action) => {
      state.selectedDiscipline = action.payload;
      state.offset = 0;
      state.items = [];
      state.hasMore = true;
    },
    clearArticles: (state) => {
      state.items = [];
      state.offset = 0;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchArticles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        state.loading = false;
        const { data, refresh } = action.payload;
        console.log('Processing articles data:', { data, refresh });
        
        if (!data || data.length === 0) {
          state.hasMore = false;
          if (refresh) {
            state.items = [];
          }
        } else {
          if (refresh) {
            state.items = data;
          } else {
            state.items = [...state.items, ...data];
          }
          state.offset = state.items.length;
          state.hasMore = data.length > 0;
        }
      })
      .addCase(fetchArticles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Une erreur est survenue';
        console.error('Articles fetch rejected:', action.error);
      });
  },
});

export const { setSelectedDiscipline, clearArticles } = articlesSlice.actions;
export default articlesSlice.reducer; 
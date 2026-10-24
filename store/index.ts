import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';

import authReducer, { signOut } from './authSlice';
import articlesReducer from './articlesSlice';
import profileReducer from './profileSlice';
import uiReducer from './uiSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist auth state
};

const appReducer = combineReducers({
  auth: authReducer,
  articles: articlesReducer,
  profile: profileReducer,
  ui: uiReducer,
});

// À la déconnexion, on repart d'un état vierge (hors auth, géré par authSlice)
// pour qu'aucune donnée du compte précédent ne reste affichée.
const rootReducer: typeof appReducer = (state, action) =>
  appReducer(
    action.type === signOut.fulfilled.type && state ? ({ auth: state.auth } as any) : state,
    action
  );

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
    devTools: false,
    enhancers: getDefaultEnhancers => getDefaultEnhancers().concat(devToolsEnhancer()),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 
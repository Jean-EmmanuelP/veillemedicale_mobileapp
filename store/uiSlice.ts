import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  tabBarVisible: boolean;
}

const initialState: UiState = {
  tabBarVisible: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTabBarVisible(state, action: PayloadAction<boolean>) {
      state.tabBarVisible = action.payload;
    },
    showTabBar(state) {
      state.tabBarVisible = true;
    },
    hideTabBar(state) {
      state.tabBarVisible = false;
    },
  },
});

export const { setTabBarVisible, showTabBar, hideTabBar } = uiSlice.actions;
export default uiSlice.reducer;

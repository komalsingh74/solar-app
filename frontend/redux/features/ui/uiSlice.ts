import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
}

const initialState: UIState = {
  sidebarOpen: true,
  mobileSidebarOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    setSidebarOpen: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.sidebarOpen = action.payload;
    },

    setMobileSidebarOpen: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.mobileSidebarOpen = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setMobileSidebarOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
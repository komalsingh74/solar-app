import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<AuthUser>
    ) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    },

    setAuthLoading: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.isLoading = action.payload;
    },

    clearCredentials: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
  },
});

export const {
  setCredentials,
  setAuthLoading,
  clearCredentials,
} = authSlice.actions;

export default authSlice.reducer;
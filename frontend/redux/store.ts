import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./features/auth/authSlice";
import uiReducer from "./features/ui/uiSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;

export type RootState = ReturnType<
  AppStore["getState"]
>;

export type AppDispatch = AppStore["dispatch"];
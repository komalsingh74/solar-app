"use client";

import { useEffect } from "react";
import axios from "axios";

import api from "@/lib/api";
import { authStorage } from "@/lib/auth-storage";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";

import {
  clearCredentials,
  setAuthLoading,
  setCredentials,
} from "@/redux/features/auth/authSlice";

import type { CurrentUserResponse } from "@/types/auth";

export default function AuthInitializer() {
  const dispatch = useAppDispatch();

  const isAuthenticated = useAppSelector(
    (state) => state.auth.isAuthenticated
  );

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(setAuthLoading(false));
      return;
    }

    const controller = new AbortController();

    const restoreSession = async () => {
      const token = authStorage.getToken();

      if (!token) {
        dispatch(clearCredentials());
        return;
      }

      dispatch(setAuthLoading(true));

      try {
        const response = await api.get<CurrentUserResponse>(
          "/users/me",
          { signal: controller.signal }
        );

        if (!controller.signal.aborted) {
          dispatch(
            setCredentials(response.data.data.user)
          );
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (authStorage.getToken() !== token) return;

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401 &&
          error.response?.data?.error?.code === "AUTH_INVALID"
        ) {
          authStorage.removeToken();
          dispatch(clearCredentials());
        } else {
          // Keep token for retry after network failures
          dispatch(setAuthLoading(false));
        }
      }
    };

    void restoreSession();

    return () => {
      controller.abort();
    };
  }, [dispatch, isAuthenticated]);

  return null;
}

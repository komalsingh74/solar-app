
import axios from "axios";
import { showError } from "@/lib/toast";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// Share session verification when several page requests fail together.
const sessionChecks = new Map();
const isSessionInvalid = (token) => {
  if (!sessionChecks.has(token)) {
    const check = api.get("/users/me", { _sessionCheck: true })
      .then(() => false)
      .catch((error) => error.response?.status === 401 &&
        error.response?.data?.error?.code === "AUTH_INVALID")
      .finally(() => sessionChecks.delete(token));
    sessionChecks.set(token, check);
  }
  return sessionChecks.get(token);
};

// Request interceptor: attach authentication token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      config._authToken = token || null;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: centralized error handling
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (axios.isCancel(error) || error.config?._sessionCheck) {
      return Promise.reject(error);
    }
    const status = error.response?.status;

    const message =
      error.response?.data?.message ||
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      (error.code === "ECONNABORTED"
        ? "Request timed out. Please try again."
        : !error.response
          ? "Unable to connect to server. Please check your connection."
          : "Something went wrong.");

    error.userMessage = message;

    // Handle expired or invalid authentication
    if (status === 401 && typeof window !== "undefined") {
      const currentToken = localStorage.getItem("token") || sessionStorage.getItem("token");
      const requestToken = error.config?._authToken;
      const isCurrentAuthenticatedRequest =
        typeof requestToken === "string" &&
        Boolean(currentToken) &&
        requestToken === currentToken;
      const currentPath = window.location.pathname;

      const sessionInvalid = isCurrentAuthenticatedRequest &&
        await isSessionInvalid(requestToken);

      if (sessionInvalid &&
        requestToken === (localStorage.getItem("token") || sessionStorage.getItem("token")) && (
        currentPath !== "/login" &&
        !currentPath.startsWith("/auth/login") &&
        !currentPath.startsWith("/auth/forgot-password")
      )) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        window.location.href = "/login";
      } else if (
        !isCurrentAuthenticatedRequest &&
        (currentPath === "/login" || currentPath.startsWith("/auth/"))
      ) {
        showError(message);
      } else if (!sessionInvalid) {
        showError(message);
      }
    } else {
      showError(message);
    }

    return Promise.reject(error);
  }
);

export default api;

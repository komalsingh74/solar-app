const TOKEN_KEY = "token";

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;

    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string, remember = true): void => {
    if (typeof window === "undefined") return;

    authStorage.removeToken();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    if (typeof window === "undefined") return;

    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
};
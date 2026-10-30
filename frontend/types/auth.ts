export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  permissions?: string[];
  company?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: AuthUser;
  };
}

export interface CurrentUserResponse {
  success: boolean;
  data: {
    user: AuthUser;
  };
}
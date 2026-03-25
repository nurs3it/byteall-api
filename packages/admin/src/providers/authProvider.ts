import type { AuthProvider } from '@refinedev/core';
import axios from 'axios';

const API_URL = '/api';

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login/email`, {
        email,
        password,
      });

      // ResponseInterceptor wraps responses in { data: ..., message: 'success' }
      const payload = data.data ?? data;
      const { access_token, refresh_token } = payload;

      // Decode JWT to check role (server enforces this too)
      const tokenPayload = JSON.parse(atob(access_token.split('.')[1]));

      if (tokenPayload.role !== 'admin') {
        return {
          success: false,
          error: { name: 'Forbidden', message: 'Доступ запрещён. Только для администраторов.' },
        };
      }

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      return { success: true, redirectTo: '/dashboard' };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: 'Ошибка входа',
          message: error?.response?.data?.message ?? 'Неверные учётные данные',
        },
      };
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('access_token');

    if (refreshToken && accessToken) {
      try {
        await axios.post(
          `${API_URL}/auth/logout`,
          { refresh_token: refreshToken },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
      } catch {
        // ignore logout errors
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return { authenticated: false, redirectTo: '/login' };

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return { authenticated: false, redirectTo: '/login' };

        const { data } = await axios.post(`${API_URL}/auth/token/refresh`, {
          refresh_token: refreshToken,
        });
        // API returns only new access_token, refresh_token stays the same
        const newAccessToken = (data.data ?? data).access_token;
        localStorage.setItem('access_token', newAccessToken);
      }
    } catch {
      return { authenticated: false, redirectTo: '/login' };
    }

    return { authenticated: true };
  },

  getPermissions: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch {
      return null;
    }
  },

  getIdentity: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      return null;
    }
  },

  onError: async (error) => {
    if (error?.response?.status === 401) {
      return { logout: true, redirectTo: '/login' };
    }
    return { error };
  },
};

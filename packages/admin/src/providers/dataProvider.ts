import type { DataProvider } from '@refinedev/core';
import axios from 'axios';

const API_URL = '/api';

const axiosInstance = axios.create({ baseURL: API_URL });

// Attach JWT token to every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Unwrap { data: ..., message: 'success' } from ResponseInterceptor
axiosInstance.interceptors.response.use((response) => {
  if (response.data?.data !== undefined) {
    response.data = response.data.data;
  }
  return response;
});

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination }) => {
    const current = pagination?.current ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const start = (current - 1) * pageSize;
    const end = start + pageSize;

    const { data, headers } = await axiosInstance.get(`/${resource}`, {
      params: { _start: start, _end: end },
    });

    const total = parseInt(headers['x-total-count'] ?? '0', 10);

    return { data: Array.isArray(data) ? data : [], total };
  },

  getOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.get(`/${resource}/${id}`);
    return { data };
  },

  update: async ({ resource, id, variables }) => {
    const { data } = await axiosInstance.patch(`/${resource}/${id}`, variables);
    return { data };
  },

  create: async ({ resource, variables }) => {
    const { data } = await axiosInstance.post(`/${resource}`, variables);
    return { data };
  },

  deleteOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.delete(`/${resource}/${id}`);
    return { data };
  },

  getApiUrl: () => API_URL,

  custom: async ({ url, method, payload }) => {
    // url comes as full path e.g. '/api/users/stats'
    // axiosInstance already has baseURL '/api' — strip the prefix to avoid doubling
    const { data } = await axiosInstance.request({
      url: url.replace(API_URL, ''),
      method,
      data: payload,
    });
    return { data };
  },
};

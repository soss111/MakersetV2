/**
 * Centralized API client
 * Single source of truth for API base URL
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Get API base URL
 */
export function getApiBaseUrl(): string {
  // In production, use the current origin
  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  // For development, use environment variable or default to Netlify Dev
  return import.meta.env.VITE_API_URL || 'http://localhost:8888';
}

/**
 * Create configured axios instance
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Handle JSON envelope { success, data?, error? }
    if (response.data && typeof response.data === 'object') {
      if (response.data.success === false) {
        return Promise.reject(new Error(response.data.error || 'Request failed'));
      }
      // Return data if wrapped in envelope
      if (response.data.data !== undefined) {
        return { ...response, data: response.data.data };
      }
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth token on 401
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * API fetch wrapper (alternative to axios)
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('authToken');
  const baseURL = getApiBaseUrl();

  const response = await fetch(`${baseURL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  
  // Handle JSON envelope
  if (data.success === false) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data !== undefined ? data.data : data;
}

import axios from 'axios';

// Change this to your actual API URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial: Sends the JWT Cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor: Handle 401 (Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if session expires
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

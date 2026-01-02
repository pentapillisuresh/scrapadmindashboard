// src/services/api.js
import axios from 'axios';

// Use import.meta.env for Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased to 30 seconds for file uploads
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add additional headers for specific endpoints
    if (config.url.includes('/auth/reset-password')) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - UPDATED to handle API response structure
api.interceptors.response.use(
  (response) => {
    // If the response has success: true and data field, return the data
    if (response.data && response.data.success) {
      return response.data;
    }
    // Otherwise return the full response data
    return response.data;
  },
  async (error) => {
    // Handle errors - you can customize error messages here
    const originalRequest = error.config;
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      
      console.error('API Error Response:', {
        url: originalRequest.url,
        status,
        data,
        method: originalRequest.method
      });
      
      // Handle 401 Unauthorized - token expired
      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        // Try to refresh token if refresh token endpoint exists
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await api.post('/auth/refresh-token', {
              refreshToken
            });
            
            if (refreshResponse.data?.token) {
              localStorage.setItem('token', refreshResponse.data.token);
              
              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
              return api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Clear tokens and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }
      }
      
      // Return a structured error response
      return Promise.reject({
        status,
        data,
        message: data?.message || `Request failed with status ${status}`,
        isNetworkError: false
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response:', {
        url: originalRequest.url,
        error: error.request
      });
      
      return Promise.reject({
        status: null,
        data: null,
        message: 'No response from server. Please check your network connection.',
        isNetworkError: true
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Setup Error:', {
        url: originalRequest.url,
        message: error.message
      });
      
      return Promise.reject({
        status: null,
        data: null,
        message: error.message || 'Failed to make request',
        isNetworkError: false
      });
    }
  }
);

// Enhanced Auth Service with complete reset password functionality
export const authService = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  register: (data) => api.post('/auth/register', data),
  
  // Complete reset-password endpoint implementation
  resetPassword: async (data) => {
    try {
      const response = await api.post('/auth/reset-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
        email: data.email
      });
      
      return {
        success: true,
        message: response.message || 'Password reset successfully',
        data: response.data
      };
    } catch (error) {
      // Return formatted error response
      return {
        success: false,
        message: error.message || 'Failed to reset password',
        error: error.data || error
      };
    }
  },
  
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  getUserInfo: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  
  // Validate password reset data
  validateResetData: (data) => {
    const errors = {};
    
    if (!data.oldPassword || data.oldPassword.trim() === '') {
      errors.oldPassword = 'Current password is required';
    }
    
    if (!data.newPassword || data.newPassword.trim() === '') {
      errors.newPassword = 'New password is required';
    } else if (data.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters long';
    }
    
    if (!data.confirmPassword || data.confirmPassword.trim() === '') {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (data.newPassword !== data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!data.email || data.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// Real Admin Service
export const adminService = {
  getAllRequests: (params = {}) => api.get('/categories/requests/all', { params }),
  getPendingRequests: () => api.get('/admin/requests/pending'),
  getRequestDetails: (id) => api.get(`/categories/requests/all/${id}`),
  acceptRequest: (id, data) => api.put(`/admin/requests/${id}/accept`, data),
  rejectRequest: (id, reason) => api.put(`/admin/requests/${id}/reject`, { reason }),
  updateRequestStatus: (id, data) => api.put(`/admin/requests/${id}/status`, data),
  updateItemWeights: (id, data) => api.put(`/admin/requests/${id}/weights`, data),
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getAllUsers: () => api.get('/admin/users'),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  
  // Admin password reset for users
  resetUserPassword: (userId, data) => api.post(`/admin/users/${userId}/reset-password`, data),
};

// Real Category Service
export const categoryService = {
  getAllCategories: () => api.get('/categories'),
  
  createCategory: (categoryData) => {
    const formData = new FormData();
    
    formData.append('name', categoryData.name);
    formData.append('description', categoryData.description || '');
    formData.append('is_active', categoryData.is_active !== undefined ? categoryData.is_active : true);
    
    if (categoryData.icon instanceof File) {
      formData.append('icon', categoryData.icon);
    }
    
    return api.post('/categories', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  updateCategory: (id, categoryData) => {
    const formData = new FormData();
    
    if (categoryData.name !== undefined) {
      formData.append('name', categoryData.name);
    }
    if (categoryData.description !== undefined) {
      formData.append('description', categoryData.description);
    }
    if (categoryData.is_active !== undefined) {
      formData.append('is_active', categoryData.is_active);
    }
    
    if (categoryData.icon instanceof File) {
      formData.append('icon', categoryData.icon);
    } else if (categoryData.icon === null || categoryData.icon === '') {
      formData.append('icon', '');
    }
    
    return api.put(`/categories/${id}`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteCategory: (id) => api.delete(`/categories/${id}`),
  toggleCategoryStatus: (id, isActive) => api.put(`/categories/${id}`, { is_active: isActive }),
  getCategoryById: (id) => api.get(`/categories/${id}`)
};

// Other Services
export const scrapService = {
  createRequest: (data) => {
    const formData = new FormData();
    
    formData.append('address_id', data.address_id);
    formData.append('pickup_date', data.pickup_date);
    formData.append('pickup_time_slot', data.pickup_time_slot);
    formData.append('notes', data.notes || '');
    formData.append('items', JSON.stringify(data.items));
    
    if (data.images) {
      data.images.forEach((file, index) => {
        formData.append('images', file);
        formData.append('image_item_index', index);
      });
    }
    
    return api.post('/scrap/request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getUserRequests: (params = {}) => api.get('/categories/requests/all', { params }),
  getRequestDetails: (id) => api.get(`/categories/requests/all/${id}`),
  cancelRequest: (id) => api.delete(`/scrap/requests/${id}/cancel`),
  getCategories: () => api.get('/categories'),
};

export const userService = {
  getUserAddresses: () => api.get('/user/addresses'),
  addAddress: (data) => api.post('/user/addresses', data),
  updateAddress: (id, data) => api.put(`/user/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/user/addresses/${id}`),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  updateUser: (id, data) => api.put(`/user/${id}`, data),
  
  // User-specific password change (alternative to authService.resetPassword)
  changePassword: (data) => api.post('/user/change-password', data),
  
  // Get user security settings
  getSecuritySettings: () => api.get('/user/security-settings'),
  
  // Update user security settings
  updateSecuritySettings: (data) => api.put('/user/security-settings', data),
};

// Utility functions for API
export const apiUtils = {
  // Generate headers for authenticated requests
  getAuthHeaders: () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  },
  
  // Handle API errors consistently
  handleApiError: (error, defaultMessage = 'An error occurred') => {
    if (error.response) {
      return error.response.data?.message || defaultMessage;
    } else if (error.request) {
      return 'No response from server. Please check your connection.';
    } else {
      return error.message || defaultMessage;
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },
  
  // Clear authentication data
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  },
  
  // Store authentication data
  storeAuth: (data) => {
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user) {
      localStorage.setItem('userData', JSON.stringify(data.user));
    }
  }
};

export default api;
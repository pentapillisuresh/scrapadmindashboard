// components/CategoryManagement.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { categoryService } from '../services/api';

// Default placeholder icon (SVG)
const defaultIcon = (
  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

// Fallback icon (local image or data URL)
const fallbackIcon = (
  <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded">
    <span className="text-gray-600 text-sm font-semibold">ICON</span>
  </div>
);

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '',
    is_active: true  // Default to active
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [failedImages, setFailedImages] = useState(new Set());
  
  const fileInputRef = useRef(null);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Function to fix URL issues - MAIN FIX
  const fixImageUrl = (url) => {
    if (!url) return null;
    
    console.log('Original URL:', url);
    
    // If it's already a full URL, fix the protocol and remove duplicate slashes
    if (url.startsWith('http') || url.startsWith('//')) {
      // Fix missing colon in protocol (http:/ -> http://)
      let fixedUrl = url.replace(/^http:\//, 'http://').replace(/^https:\//, 'https://');
      
      // Remove duplicate slashes after protocol
      fixedUrl = fixedUrl.replace(/(https?:\/\/)\/+/g, '$1');
      
      // Remove duplicate /uploads//uploads/ patterns
      fixedUrl = fixedUrl.replace(/\/uploads\/\/uploads\//g, '/uploads/');
      
      // Remove duplicate /uploads/ anywhere in the path
      fixedUrl = fixedUrl.replace(/\/uploads\/\/uploads/g, '/uploads');
      
      console.log('Fixed URL:', fixedUrl);
      return fixedUrl;
    }
    
    // For relative URLs, ensure proper format
    if (url.includes('uploads')) {
      // Remove leading slashes to make it relative
      let relativeUrl = url.replace(/^\/+/, '');
      
      // Ensure it starts with 'uploads/'
      if (!relativeUrl.startsWith('uploads/')) {
        relativeUrl = 'uploads/' + relativeUrl.replace(/^\/?uploads\//, '');
      }
      
      // Remove any duplicate 'uploads' in the path
      relativeUrl = relativeUrl.replace(/uploads\/\/?uploads\//g, 'uploads/');
      
      // Return as relative URL starting with '/'
      return '/' + relativeUrl;
    }
    
    // For simple filenames, prepend the uploads path
    return `/uploads/category-icons/${url}`;
  };

  // Function to get preview URL for existing image
  const getPreviewUrl = (iconUrl) => {
    if (!iconUrl) return '';
    
    // Fix the URL first
    const fixedUrl = fixImageUrl(iconUrl);
    
    console.log('Getting preview:', { original: iconUrl, fixed: fixedUrl });
    
    // If it's already a full URL, return the fixed version
    if (fixedUrl.startsWith('http://') || fixedUrl.startsWith('https://') || fixedUrl.startsWith('blob:')) {
      return fixedUrl;
    }
    
    // If it's a relative URL, make it absolute
    if (fixedUrl.startsWith('/')) {
      const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
      // Ensure we don't get double slashes
      const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
      const normalizedPath = fixedUrl.replace(/^\/+/, '');
      
      const fullUrl = `${normalizedBaseUrl}/${normalizedPath}`;
      console.log('Constructed full URL:', fullUrl);
      return fullUrl;
    }
    
    // Otherwise return as is
    return fixedUrl;
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await categoryService.getAllCategories();
      if (response.success) {
        // Process categories with fixed icon URLs
        const processedCategories = (response.data || []).map(category => {
          const fixedIcon = category.icon ? fixImageUrl(category.icon) : null;
          
          console.log('Processing category:', {
            id: category.id,
            name: category.name,
            originalIcon: category.icon,
            fixedIcon: fixedIcon,
            previewUrl: fixedIcon ? getPreviewUrl(fixedIcon) : null
          });
          
          return {
            ...category,
            icon: fixedIcon,
            is_active: Boolean(category.is_active)
          };
        });
        
        setCategories(processedCategories);
      } else {
        setError('Failed to load categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle image loading errors
  const handleImageError = (categoryId, imageUrl) => {
    console.error(`Image failed to load for category ${categoryId}:`, imageUrl);
    setFailedImages(prev => new Set([...prev, categoryId]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_active: formData.is_active,
      };

      // Only include icon if uploadedImage exists
      if (uploadedImage) {
        categoryData.icon = uploadedImage;
      } else if (editingCategory && !previewImage) {
        // If editing and no preview image (image removed), send empty string
        categoryData.icon = '';
      }

      if (editingCategory) {
        // Update existing category
        const response = await categoryService.updateCategory(editingCategory.id, categoryData);
        setSuccessMessage('Category updated successfully!');
        
        // Update the icon URL in state
        if (response.data) {
          const fixedIcon = response.data.icon ? fixImageUrl(response.data.icon) : null;
          const updatedCategory = {
            ...response.data,
            icon: fixedIcon,
            is_active: Boolean(response.data.is_active)
          };
          
          // Clear failed image status for this category
          setFailedImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(editingCategory.id);
            return newSet;
          });
          
          setCategories(categories.map(cat => 
            cat.id === editingCategory.id ? updatedCategory : cat
          ));
        }
      } else {
        // Create new category - icon is required for new categories
        if (!uploadedImage) {
          setError('Please upload an icon/image for the category');
          setIsSubmitting(false);
          return;
        }
        
        const response = await categoryService.createCategory(categoryData);
        setSuccessMessage('Category created successfully!');
        
        // Add new category with fixed icon URL
        if (response.data) {
          const fixedIcon = response.data.icon ? fixImageUrl(response.data.icon) : null;
          const newCategory = {
            ...response.data,
            icon: fixedIcon,
            is_active: Boolean(response.data.is_active)
          };
          setCategories([newCategory, ...categories]);
        }
      }
      
      // Close modal and reset form
      resetForm();
      setShowModal(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error saving category:', error);
      setError(
        error.response?.data?.message || 
        error.message || 
        'Failed to save category. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      description: '',
      is_active: true  // Reset to active by default
    });
    setUploadedImage(null);
    setPreviewImage('');
    setEditingCategory(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ 
      name: category.name,
      description: category.description || '',
      is_active: Boolean(category.is_active)  // Ensure boolean
    });
    
    // Set preview image for existing category
    if (category.icon) {
      const previewUrl = getPreviewUrl(category.icon);
      console.log('Setting preview for edit:', { 
        categoryId: category.id,
        originalIcon: category.icon, 
        previewUrl: previewUrl 
      });
      setPreviewImage(previewUrl);
    } else {
      setPreviewImage('');
    }
    
    // Clear uploaded image for new upload
    setUploadedImage(null);
    
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        setError('');
        await categoryService.deleteCategory(id);
        setSuccessMessage('Category deleted successfully!');
        
        // Remove from local state
        setCategories(categories.filter(cat => cat.id !== id));
        
        // Clear from failed images set
        setFailedImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (error) {
        console.error('Error deleting category:', error);
        setError(
          error.response?.data?.message || 
          'Failed to delete category. Please try again.'
        );
      }
    }
  };

  const handleStatusToggle = async (category) => {
    try {
      setError('');
      const newStatus = !category.is_active;
      await categoryService.toggleCategoryStatus(category.id, newStatus);
      setSuccessMessage(`Category ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      
      // Update local state
      setCategories(categories.map(cat => 
        cat.id === category.id ? { ...cat, is_active: newStatus } : cat
      ));
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error toggling category status:', error);
      setError(
        error.response?.data?.message || 
        'Failed to update category status. Please try again.'
      );
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload an image file (JPEG, PNG, SVG, GIF, WEBP)');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('File size should be less than 2MB');
        return;
      }
      
      setUploadedImage(file);
      setPreviewImage(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    setPreviewImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter categories
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && category.is_active) ||
      (filterStatus === 'inactive' && !category.is_active);
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to render category icon - ENHANCED with better error handling
  const renderCategoryIcon = (category) => {
    const iconFailed = failedImages.has(category.id);
    
    if (iconFailed || !category.icon) {
      return fallbackIcon;
    }
    
    // Get the actual URL to use
    const imageUrl = getPreviewUrl(category.icon);
    console.log(`Rendering icon for ${category.name}:`, imageUrl);
    
    return (
      <img 
        src={imageUrl} 
        alt={category.name}
        className="w-8 h-8 object-contain"
        onError={() => handleImageError(category.id, imageUrl)}
        onLoad={() => {
          // If image loads successfully, remove from failed images
          if (failedImages.has(category.id)) {
            console.log(`Image loaded successfully for category ${category.id}`);
            setFailedImages(prev => {
              const newSet = new Set(prev);
              newSet.delete(category.id);
              return newSet;
            });
          }
        }}
        loading="lazy"
        crossOrigin="anonymous"
      />
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Debug Info:</span>
            <span className="ml-2">Total Categories: {categories.length}</span>
            <span className="ml-2">Failed Images: {failedImages.size}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-500 mt-1">Manage and organize your scrap categories</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title={viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
          >
            {viewMode === 'grid' ? (
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{categories.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {categories.filter(cat => cat.is_active).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Inactive</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {categories.filter(cat => !cat.is_active).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Last Updated</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {categories.length > 0 ? 'Today' : '--'}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search categories by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-500">Loading categories...</p>
          </div>
        </div>
      ) : filteredCategories.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">No categories found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search criteria' 
              : 'Get started by creating your first category'}
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5 inline mr-2 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Category
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredCategories.map((category) => (
            <div 
              key={category.id} 
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mr-4 border border-gray-200">
                      {renderCategoryIcon(category)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{category.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {category.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(category.is_active)}`}>
                    {getStatusText(category.is_active)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleStatusToggle(category)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors border ${category.is_active ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'}`}
                  >
                    {category.is_active ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Disable
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Enable
                      </>
                    )}
                  </button>
                </div>
                
                <button
                  onClick={() => handleDelete(category.id)}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-lg text-sm font-medium transition-colors border border-red-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4 border border-gray-200">
                          {renderCategoryIcon(category)}
                        </div>
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-500 text-sm line-clamp-2">
                        {category.description || 'No description'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(category.is_active)}`}>
                        {getStatusText(category.is_active)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 text-sm">
                      {formatDate(category.created_at)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleStatusToggle(category)}
                          className={`p-2 rounded-lg transition-colors ${category.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={category.is_active ? 'Disable' : 'Enable'}
                        >
                          {category.is_active ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal - Fixed Height */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-auto my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Enter category name (e.g., Electronics)"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-24 text-sm"
                    placeholder="Enter category description (optional)"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Image Upload Section - Compact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Icon/Image {!editingCategory && <span className="text-red-500">*</span>}
                  </label>
                  
                  {/* Image Preview */}
                  <div className="mb-3">
                    <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                      {previewImage ? (
                        <div className="relative mb-2">
                          <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                            <img 
                              src={previewImage} 
                              alt="Preview" 
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                console.error('Preview image failed to load:', previewImage);
                                e.target.style.display = 'none';
                                const container = e.target.parentElement;
                                if (container) {
                                  container.innerHTML = '';
                                  container.appendChild(document.createElement('div')).className = 'w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center';
                                  container.firstChild.appendChild(defaultIcon.props.children);
                                }
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={removeUploadedImage}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                            disabled={isSubmitting}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                          {defaultIcon}
                        </div>
                      )}
                      
                      {/* Upload Button */}
                      <label className={`cursor-pointer text-sm ${isSubmitting ? 'opacity-50' : ''}`}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isSubmitting}
                        />
                        <div className={`px-3 py-1.5 ${isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center`}>
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          {uploadedImage ? 'Change File' : (previewImage ? 'Change Image' : 'Upload Image')}
                        </div>
                      </label>
                      
                      {/* File Info */}
                      {uploadedImage && (
                        <div className="mt-2 p-1.5 bg-blue-50 rounded-lg text-xs">
                          <p className="text-blue-700 truncate">
                            <span className="font-medium">Selected:</span> {uploadedImage.name}
                          </p>
                          <p className="text-blue-600">
                            Size: {(uploadedImage.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {editingCategory 
                        ? 'Upload a new file to change the icon (optional)' 
                        : 'Supported: JPG, PNG, SVG, GIF. Max: 2MB'}
                    </p>
                  </div>
                </div>

                {/* Status Selection - Compact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="flex gap-2">
                    {/* Active Option */}
                    <label className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''} ${formData.is_active ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 ${formData.is_active ? 'border-blue-500' : 'border-gray-400'}`}>
                          {formData.is_active && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <input
                          type="radio"
                          name="status"
                          value="true"
                          checked={formData.is_active}
                          onChange={() => setFormData({ ...formData, is_active: true })}
                          className="hidden"
                          disabled={isSubmitting}
                        />
                        <span className="font-medium text-gray-900 text-sm">Active</span>
                      </div>
                    </label>
                    
                    {/* Inactive Option */}
                    <label className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''} ${!formData.is_active ? 'border-gray-500 bg-gray-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 ${!formData.is_active ? 'border-gray-500' : 'border-gray-400'}`}>
                          {!formData.is_active && (
                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          )}
                        </div>
                        <input
                          type="radio"
                          name="status"
                          value="false"
                          checked={!formData.is_active}
                          onChange={() => setFormData({ ...formData, is_active: false })}
                          className="hidden"
                          disabled={isSubmitting}
                        />
                        <span className="font-medium text-gray-900 text-sm">Inactive</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center min-w-[100px]`}
                  disabled={isSubmitting || !formData.name.trim() || (!uploadedImage && !editingCategory && !previewImage)}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingCategory ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingCategory ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
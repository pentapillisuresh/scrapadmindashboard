import React, { useEffect, useRef, useState } from 'react';
import { categoryService } from '../services/api';

/* ================= IMAGE URL RESOLVER ================= */
const resolveImageUrl = (icon) => {
  if (!icon) return null;

  // Already full URL
  if (icon.startsWith('http://') || icon.startsWith('https://')) {
    return icon;
  }

  // Base URL (remove /api or /api/v1 if present)
  const BASE_URL =
    import.meta.env.VITE_API_URL
      ?.replace('/api/v1', '')
      ?.replace('/api', '') || 'http://localhost:5001';

  const cleanPath = icon.replace(/^\/+/, '');
  return `${BASE_URL}/${cleanPath}`;
};

/* ================= SVG ICONS ================= */
const icons = {
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  toggleOn: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  toggleOff: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  upload: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  loading: (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  category: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
};

/* ================= FALLBACK ICON ================= */
const fallbackIcon = (
  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
    <div className="text-gray-500 font-semibold text-sm">
      {icons.category}
    </div>
  </div>
);

/* ================= COMPONENT ================= */
const CategoryManagement = () => {
  /* ---------- STATE ---------- */
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [uploadedImage, setUploadedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const fileInputRef = useRef(null);

  /* ================= FETCH ONCE ================= */
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await categoryService.getAllCategories();
      console.log('Load Categories Response:', res); // Debug
      
      if (res?.success) {
        // Handle different response structures
        let categoriesData = res.data;
        
        // If data is an object with categories property
        if (categoriesData && typeof categoriesData === 'object' && !Array.isArray(categoriesData)) {
          if (categoriesData.categories && Array.isArray(categoriesData.categories)) {
            categoriesData = categoriesData.categories;
          } else if (categoriesData.data && Array.isArray(categoriesData.data)) {
            categoriesData = categoriesData.data;
          }
        }
        
        // Ensure we have an array
        if (!Array.isArray(categoriesData)) {
          console.error('Invalid categories data format:', categoriesData);
          setCategories([]);
          return;
        }
        
        const processed = categoriesData.map(c => ({
          ...c,
          icon: resolveImageUrl(c.icon),
          is_active: Boolean(c.is_active)
        }));
        
        console.log('Processed categories:', processed); // Debug
        setCategories(processed);
      } else {
        console.error('API not successful:', res);
        setError(res?.message || 'Failed to load categories');
        setCategories([]);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= ICON ================= */
  const renderIcon = (category) => {
    if (!category.icon) return fallbackIcon;

    return (
      <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
        <img
          src={category.icon}
          alt={category.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            console.error('Image failed:', category.icon);
            e.currentTarget.style.display = 'none';
            // Replace with fallback
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = '';
              parent.appendChild(fallbackIcon);
            }
          }}
        />
      </div>
    );
  };

  /* ================= FORM HELPERS ================= */
  const resetForm = () => {
    setFormData({ name: '', description: '', is_active: true });
    setUploadedImage(null);
    setPreviewImage('');
    setEditingCategory(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: Boolean(category.is_active)
    });
    setPreviewImage(category.icon || '');
    setUploadedImage(null);
    setShowModal(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    setUploadedImage(file);
    setPreviewImage(URL.createObjectURL(file));
    setError('');
  };

  /* ================= CRUD ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_active: formData.is_active
      };

      if (uploadedImage) payload.icon = uploadedImage;

      let response;
      if (editingCategory) {
        response = await categoryService.updateCategory(editingCategory.id, payload);
        console.log('Update Response:', response); // Debug
        
        if (response?.success) {
          // Get the updated category from response
          const updatedCategory = response.data || response.category || response.result;
          
          if (updatedCategory) {
            // Process the updated category
            const processedCategory = {
              ...updatedCategory,
              icon: resolveImageUrl(updatedCategory.icon),
              is_active: Boolean(updatedCategory.is_active)
            };
            
            // Update the category in the list
            setCategories(prev =>
              prev.map(cat =>
                cat.id === editingCategory.id ? processedCategory : cat
              )
            );
          } else {
            // If response doesn't contain updated category, refresh the list
            await loadCategories();
          }
        } else {
          throw new Error(response?.message || 'Update failed');
        }
      } else {
        if (!uploadedImage) {
          setError('Icon is required');
          setIsSubmitting(false);
          return;
        }

        response = await categoryService.createCategory(payload);
        console.log('Create Response:', response); // Debug
        
        if (response?.success) {
          // Get the new category from response
          const newCategory = response.data || response.category || response.result;
          
          if (newCategory) {
            const processedCategory = {
              ...newCategory,
              icon: resolveImageUrl(newCategory.icon),
              is_active: Boolean(newCategory.is_active)
            };
            
            // Add new category to the beginning of the list
            setCategories(prev => [processedCategory, ...prev]);
          } else {
            // If response doesn't contain new category, refresh the list
            await loadCategories();
          }
        } else {
          throw new Error(response?.message || 'Create failed');
        }
      }

      setSuccessMessage(`Category ${editingCategory ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      resetForm();
      setShowModal(false);

    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    setDeletingId(id);
    try {
      await categoryService.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      setSuccessMessage('Category deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (category) => {
    setTogglingId(category.id);
    try {
      const newStatus = !category.is_active;
      await categoryService.toggleCategoryStatus(category.id, newStatus);

      setCategories(prev =>
        prev.map(c =>
          c.id === category.id ? { ...c, is_active: newStatus } : c
        )
      );
      setSuccessMessage(`Category ${newStatus ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  /* ================= LOADING SKELETON ================= */
  const LoadingSkeleton = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  /* ================= MAIN UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
            <p className="text-gray-600 mt-2">Manage scrap categories with icons and descriptions</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#017B83] to-[#019fa7] text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm"
          >
            {icons.plus}
            Add New Category
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center text-green-800">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center text-red-800">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Debug Info */}
        {!loading && (
          <div className="mb-4 text-sm text-gray-500">
            Showing {categories.length} categories
          </div>
        )}

        {/* Categories Grid */}
        {loading ? (
          <LoadingSkeleton />
        ) : categories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {icons.category}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first category</p>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#017B83] text-white rounded-lg hover:bg-[#016a70] transition-colors"
            >
              {icons.plus}
              Create Category
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {renderIcon(cat)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        cat.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {cat.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {cat.description}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {icons.edit}
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(cat)}
                    disabled={togglingId === cat.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                      cat.is_active
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    }`}
                  >
                    {togglingId === cat.id ? icons.loading : cat.is_active ? icons.toggleOff : icons.toggleOn}
                    {cat.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                  >
                    {deletingId === cat.id ? icons.loading : icons.trash}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {!loading && categories.length > 0 && (
          <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Categories: <span className="font-semibold text-gray-900">{categories.length}</span>
              </div>
              <div className="text-sm text-gray-600">
                Active: <span className="font-semibold text-green-600">
                  {categories.filter(c => c.is_active).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {icons.close}
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent transition-colors"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Enter category description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent transition-colors resize-none"
                />
              </div>

              {/* Icon Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Icon {!editingCategory && '*'}
                </label>
                
                {/* Preview */}
                {previewImage && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-2">Preview:</div>
                    <div className="w-20 h-20 border border-gray-300 rounded-lg overflow-hidden flex items-center justify-center">
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#017B83] transition-colors">
                  <div className="mb-3 text-gray-400">
                    {icons.upload}
                  </div>
                  <label className="cursor-pointer">
                    <span className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </span>
                    <span className="block text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF up to 5MB
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Active Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#017B83]"></div>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (!editingCategory && !uploadedImage)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#017B83] text-white rounded-lg hover:bg-[#016a70] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      {icons.loading}
                      {editingCategory ? 'Updating...' : 'Creating...'}
                    </>
                  ) : editingCategory ? (
                    'Update Category'
                  ) : (
                    'Create Category'
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
import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/api';

const ScrapRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [editingWeights, setEditingWeights] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [failedImages, setFailedImages] = useState(new Set());

  // Fetch user data from localStorage on mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
  }, []);

  // Function to fix URL issues - Same as CategoryManagement
  const fixImageUrl = useCallback((url) => {
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
    return `/uploads/${url}`;
  }, []);

  // Function to get preview URL for existing image
  const getPreviewUrl = useCallback((imageUrl) => {
    if (!imageUrl) return '';
    
    // Fix the URL first
    const fixedUrl = fixImageUrl(imageUrl);
    
    console.log('Getting preview for scrap image:', { original: imageUrl, fixed: fixedUrl });
    
    // If it's already a full URL, return the fixed version
    if (fixedUrl.startsWith('http://') || fixedUrl.startsWith('https://') || fixedUrl.startsWith('blob:')) {
      return fixedUrl;
    }
    
    // If it's a relative URL, make it absolute
    if (fixedUrl.startsWith('/')) {
      const baseUrl = window.location.origin || 'http://localhost:5001';
      // Ensure we don't get double slashes
      const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
      const normalizedPath = fixedUrl.replace(/^\/+/, '');
      
      const fullUrl = `${normalizedBaseUrl}/${normalizedPath}`;
      console.log('Constructed full URL for scrap image:', fullUrl);
      return fullUrl;
    }
    
    // Otherwise return as is
    return fixedUrl;
  }, [fixImageUrl]);

  // Function to handle image loading errors
  const handleImageError = useCallback((imageId, imageUrl) => {
    console.error(`Image failed to load:`, imageUrl);
    setFailedImages(prev => new Set([...prev, imageId]));
  }, []);

  // Fallback image component
  const FallbackImage = ({ className }) => (
    <div className={`${className} flex items-center justify-center bg-gray-200 rounded`}>
      <span className="text-gray-600 text-xs font-semibold">IMAGE</span>
    </div>
  );

  // Fetch requests
  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate })
      };

      const response = await adminService.getAllRequests(params);

      // Handle the API response structure
      if (response && response.success) {
        const data = response.data || response;
        
        // Process requests to fix image URLs
        const processedRequests = (data.requests || []).map(request => {
          if (request.RequestItems) {
            return {
              ...request,
              RequestItems: request.RequestItems.map(item => ({
                ...item,
                RequestImages: (item.RequestImages || []).map(image => ({
                  ...image,
                  // Fix the image_url for display
                  image_url: fixImageUrl(image.image_url)
                }))
              }))
            };
          }
          return request;
        });
        
        setRequests(processedRequests);
        setPagination({
          page: data.pagination?.page || pagination.page,
          limit: data.pagination?.limit || pagination.limit,
          total: data.pagination?.total || data.requests?.length || 0,
          totalPages: data.pagination?.totalPages ||
            Math.ceil((data.pagination?.total || data.requests?.length || 0) / (data.pagination?.limit || pagination.limit))
        });
      } else {
        setError(response?.message || 'Failed to fetch requests');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to fetch requests');
      console.error('Fetch requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch request details
  const fetchRequestDetails = async (request) => {
    setLoading(true);
    setError(null);
    try {
      // Process the request to fix image URLs before setting it as selected
      const processedRequest = {
        ...request,
        RequestItems: (request.RequestItems || []).map(item => ({
          ...item,
          RequestImages: (item.RequestImages || []).map(image => ({
            ...image,
            image_url: fixImageUrl(image.image_url)
          }))
        }))
      };
      
      setSelectedRequest(processedRequest);
      setViewMode('details');
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to fetch request details');
      console.error('Fetch request details error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update request status
  const updateRequestStatus = async (requestId, status, notes = '') => {
    setUpdateLoading(true);
    setError(null);
    try {
      const response = await adminService.updateRequestStatus(requestId, {
        status,
        admin_notes: notes
      });

      if (response && response.success) {
        const updatedRequest = response.data || response;

        // Update local state
        setRequests(prev => prev.map(req =>
          req.id === requestId ? updatedRequest : req
        ));

        if (selectedRequest?.id === requestId) {
          setSelectedRequest(updatedRequest);
        }

        alert(`Request ${status} successfully`);
        return true;
      } else {
        setError(response?.message || 'Failed to update status');
        return false;
      }
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to update status');
      console.error('Update status error:', err);
      return false;
    } finally {
      setUpdateLoading(false);
    }
  };

  // Update item weights
  const updateItemWeights = async () => {
    if (!selectedRequest) return;

    setUpdateLoading(true);
    setError(null);
    try {
      const items = selectedRequest.RequestItems.map(item => ({
        id: item.id,
        weight: editingWeights[item.id]?.weight || item.weight,
        estimated_value: editingWeights[item.id]?.estimated_value || item.estimated_value,
        admin_notes: editingWeights[item.id]?.admin_notes || item.admin_notes
      }));

      const response = await adminService.updateItemWeights(selectedRequest.id, { items });

      if (response && response.success) {
        const updatedRequest = response.data || response;
        setSelectedRequest(updatedRequest);
        setEditingWeights({});
        alert('Item weights updated successfully');
      } else {
        setError(response?.message || 'Failed to update weights');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to update weights');
      console.error('Update weights error:', err);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Handle weight change
  const handleWeightChange = (itemId, field, value) => {
    setEditingWeights(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  // Calculate total weight and value
  const calculateTotals = () => {
    if (!selectedRequest?.RequestItems) return { weight: 0, value: 0 };

    const totals = selectedRequest.RequestItems.reduce((acc, item) => {
      const weight = editingWeights[item.id]?.weight || item.weight || 0;
      const value = editingWeights[item.id]?.estimated_value || item.estimated_value || 0;

      acc.weight += parseFloat(weight) || 0;
      acc.value += parseFloat(value) || 0;

      return acc;
    }, { weight: 0, value: 0 });

    return totals;
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      scheduled: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    const statusMap = {
      'pending': 'Pending',
      'accepted': 'Accepted',
      'scheduled': 'Scheduled',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'rejected': 'Rejected'
    };
    return statusMap[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown');
  };

  // Fetch requests on mount and when filters/pagination change
  useEffect(() => {
    fetchRequests();
  }, [filters.status, pagination.page]);

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: 'all',
      search: '',
      startDate: '',
      endDate: ''
    });
  };

  // Apply filters
  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchRequests();
  };

  // Handle search input key press
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  // Function to render scrap images with error handling
  const renderScrapImage = (image, imageIdx, itemId) => {
    const imageId = `${itemId}-${imageIdx}`;
    const imageFailed = failedImages.has(imageId);
    
    if (imageFailed || !image.image_url) {
      return <FallbackImage className="w-full h-full" />;
    }
    
    // Get the actual URL to use
    const imageUrl = getPreviewUrl(image.image_url);
    console.log(`Rendering scrap image ${imageIdx} for item ${itemId}:`, imageUrl);
    
    return (
      <img
         src={`http://localhost:5001${image.image_url}`}
        alt={`Scrap item ${itemId} - ${imageIdx + 1}`}
        className="w-full h-full object-cover hover:scale-105 transition-transform"
        onError={() => handleImageError(imageId, imageUrl)}
        onLoad={() => {
          // If image loads successfully, remove from failed images
          if (failedImages.has(imageId)) {
            console.log(`Image loaded successfully for scrap item ${itemId}`);
            setFailedImages(prev => {
              const newSet = new Set(prev);
              newSet.delete(imageId);
              return newSet;
            });
          }
        }}
        loading="lazy"
        crossOrigin="anonymous"
      />
    );
  };

  if (loading && viewMode === 'list' && requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017B83] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewMode === 'list' ? (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scrap Requests</h1>
              <p className="text-gray-600">Manage and review scrap collection requests</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Date Range Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={applyFilters}
                  disabled={loading}
                  className="px-4 py-2 bg-[#017B83] text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Apply Filters'}
                </button>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900 font-bold text-lg"
              >
                ×
              </button>
            </div>
          )}

          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Debug Info:</span>
                <span className="ml-2">Failed Images: {failedImages.size}</span>
              </div>
            </div>
          )}

          {/* Requests Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight/Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.request_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          User ID: {request.user_id}
                        </div>
                        <div className="text-sm text-gray-500">Address ID: {request.address_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {request.UserAddress?.address_line1 || 'No address'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {request.UserAddress?.city || ''}, {request.UserAddress?.state || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {request.RequestItems?.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {item.Category?.name || 'Item'} ({item.quantity})
                            </span>
                          )) || <span className="text-gray-500">No items</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.total_weight || '0'} kg
                        </div>
                        <div className="text-sm text-gray-600">
                          ₹{request.total_estimated_value || '0'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {formatStatus(request.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.createdAt || request.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => fetchRequestDetails(request)}
                          className="text-[#017B83] hover:text-teal-700"
                          disabled={loading}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* No Results */}
            {requests.length === 0 && !loading && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.search || filters.status !== 'all' ? 'Try adjusting your filters' : 'No scrap requests have been submitted yet'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 rounded-b-xl">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className={`px-3 py-1 border rounded text-sm ${pagination.page === pageNum
                          ? 'bg-[#017B83] text-white border-[#017B83]'
                          : 'border-gray-300 hover:bg-gray-50'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Request Details View */}
          {selectedRequest && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      setViewMode('list');
                      setSelectedRequest(null);
                      setEditingWeights({});
                      fetchRequests();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    disabled={updateLoading}
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {selectedRequest.request_number}
                    </h1>
                    <p className="text-gray-600">Review and manage scrap collection request</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedRequest.status)}`}>
                    {formatStatus(selectedRequest.status)}
                  </span>
                  {selectedRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={async () => {
                          if (await updateRequestStatus(selectedRequest.id, 'accepted')) {
                            alert('Request accepted successfully');
                          }
                        }}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {updateLoading ? 'Processing...' : 'Accept Request'}
                      </button>
                      <button
                        onClick={async () => {
                          const reason = prompt('Enter rejection reason:');
                          if (reason && await updateRequestStatus(selectedRequest.id, 'rejected', reason)) {
                            alert('Request rejected successfully');
                          }
                        }}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {updateLoading ? 'Processing...' : 'Reject Request'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                  <button
                    onClick={() => setError(null)}
                    className="float-right text-red-700 hover:text-red-900"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Debug info for development */}
              {process.env.NODE_ENV === 'development' && selectedRequest?.RequestItems && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Image Debug:</span>
                    <span className="ml-2">Total Items: {selectedRequest.RequestItems.length}</span>
                    {selectedRequest.RequestItems.map((item, idx) => (
                      <span key={idx} className="ml-2">
                        Item {idx + 1}: {item.RequestImages?.length || 0} images
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - User Info & Timeline */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Request Information Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">User ID</p>
                        <p className="font-medium text-gray-900">{selectedRequest.user_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Address ID</p>
                        <p className="font-medium text-gray-900">{selectedRequest.address_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Request Date</p>
                        <p className="font-medium text-gray-900">
                          {formatDate(selectedRequest.createdAt || selectedRequest.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pickup Date</p>
                        <p className="font-medium text-gray-900">
                          {selectedRequest.pickup_date || 'Not scheduled'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Time Slot</p>
                        <p className="font-medium text-gray-900">
                          {selectedRequest.pickup_time_slot || 'Not specified'}
                        </p>
                      </div>
                      {selectedRequest.rejection_reason && (
                        <div>
                          <p className="text-sm text-gray-600">Rejection Reason</p>
                          <p className="font-medium text-red-600">
                            {selectedRequest.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pickup Address</h3>
                    <div className="space-y-3">
                      <p className="text-gray-700">{selectedRequest.UserAddress?.address_line1 || 'No address'}</p>
                      {selectedRequest.UserAddress?.address_line2 && (
                        <p className="text-gray-700">{selectedRequest.UserAddress.address_line2}</p>
                      )}
                      <p className="text-gray-700">
                        {selectedRequest.UserAddress?.city || ''}, {selectedRequest.UserAddress?.state || ''} {selectedRequest.UserAddress?.pincode || ''}
                      </p>
                      {selectedRequest.UserAddress?.landmark && (
                        <p className="text-sm text-gray-600">
                          Landmark: {selectedRequest.UserAddress.landmark}
                        </p>
                      )}
                      {selectedRequest.UserAddress?.country && (
                        <p className="text-sm text-gray-600">
                          Country: {selectedRequest.UserAddress.country}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Timeline Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Timeline</h3>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-3 h-3 rounded-full mt-1 bg-green-500"></div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">Submitted</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(selectedRequest.createdAt || selectedRequest.created_at)}
                          </p>
                        </div>
                      </div>
                      {selectedRequest.accepted_at && (
                        <div className="flex items-start">
                          <div className="w-3 h-3 rounded-full mt-1 bg-blue-500"></div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">Accepted</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(selectedRequest.accepted_at)}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedRequest.scheduled_pickup_time && (
                        <div className="flex items-start">
                          <div className="w-3 h-3 rounded-full mt-1 bg-purple-500"></div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">Scheduled</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(selectedRequest.scheduled_pickup_time)}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedRequest.actual_pickup_time && (
                        <div className="flex items-start">
                          <div className="w-3 h-3 rounded-full mt-1 bg-blue-500"></div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">Picked Up</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(selectedRequest.actual_pickup_time)}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedRequest.completed_at && (
                        <div className="flex items-start">
                          <div className="w-3 h-3 rounded-full mt-1 bg-green-500"></div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">Completed</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(selectedRequest.completed_at)}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedRequest.rejected_at && (
                        <div className="flex items-start">
                          <div className="w-3 h-3 rounded-full mt-1 bg-red-500"></div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">Rejected</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(selectedRequest.rejected_at)}
                            </p>
                            {selectedRequest.rejection_reason && (
                              <p className="text-sm text-red-600 mt-1">
                                Reason: {selectedRequest.rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Categories & Photos */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Categories & Weight Estimation */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Categories & Weight Estimation
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        (Admin only - enter approximate weights per category)
                      </span>
                    </h3>
                    <div className="space-y-4">
                      {selectedRequest.RequestItems?.map((item, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-start">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3 mt-1">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{item.Category?.name || 'Uncategorized'}</h4>
                                <p className="text-sm text-gray-600">
                                  Quantity: {item.quantity} |
                                  {item.RequestImages?.length || 0} photo(s) uploaded
                                </p>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600 mb-1">Current Weight</div>
                              <div className="font-medium text-gray-900">
                                {item.weight || '0'} kg
                              </div>
                              <div className="text-sm text-gray-600">
                                ₹{item.estimated_value || '0'}
                              </div>
                            </div>
                          </div>

                          {/* Admin Input Fields */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estimated Weight (kg)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingWeights[item.id]?.weight || item.weight || ''}
                                onChange={(e) => handleWeightChange(item.id, 'weight', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estimated Value (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingWeights[item.id]?.estimated_value || item.estimated_value || ''}
                                onChange={(e) => handleWeightChange(item.id, 'estimated_value', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Admin Notes
                              </label>
                              <input
                                type="text"
                                value={editingWeights[item.id]?.admin_notes || item.admin_notes || ''}
                                onChange={(e) => handleWeightChange(item.id, 'admin_notes', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                                placeholder="Add notes..."
                              />
                            </div>
                          </div>

                          {/* Photo Grid */}
                          {item.RequestImages && item.RequestImages.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-900 mb-2">Uploaded Photos:</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {item.RequestImages.map((image, imageIdx) => (
                                  <div key={imageIdx} className="aspect-square rounded-lg overflow-hidden border border-gray-200 relative group">
                                    <div className="w-full h-full">
                                      {renderScrapImage(image, imageIdx, item.id)}
                                    </div>
                                    {image.is_primary && (
                                      <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                        Primary
                                      </span>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <button
                                        onClick={() => window.open(getPreviewUrl(image.image_url), '_blank')}
                                        className="bg-white text-gray-800 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
                                      >
                                        View Full Size
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Total Weight Summary */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">Total Estimated Weight & Value</p>
                            <p className="text-sm text-gray-600">Sum of all category weights</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {calculateTotals().weight.toFixed(2)} kg
                            </p>
                            <p className="text-lg font-medium text-gray-700">
                              ₹{calculateTotals().value.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          User Notes
                        </label>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {selectedRequest.notes || 'No additional notes provided by user'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Notes (Optional)
                        </label>
                        <textarea
                          rows="3"
                          value={selectedRequest.admin_notes || ''}
                          onChange={(e) => {
                            setSelectedRequest(prev => ({
                              ...prev,
                              admin_notes: e.target.value
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                          placeholder="Add admin notes here..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setViewMode('list');
                        setSelectedRequest(null);
                        setEditingWeights({});
                        fetchRequests();
                      }}
                      disabled={updateLoading}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Back to List
                    </button>
                    {Object.keys(editingWeights).length > 0 && (
                      <button
                        onClick={updateItemWeights}
                        disabled={updateLoading}
                        className="px-6 py-3 bg-[#017B83] text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                      >
                        {updateLoading ? 'Saving...' : 'Save Weight Updates'}
                      </button>
                    )}
                    {selectedRequest.status === 'accepted' && (
                      <button
                        onClick={async () => {
                          if (await updateRequestStatus(selectedRequest.id, 'scheduled')) {
                            alert('Request marked as scheduled');
                          }
                        }}
                        disabled={updateLoading}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        {updateLoading ? 'Processing...' : 'Mark as Scheduled'}
                      </button>
                    )}
                    {selectedRequest.status === 'scheduled' && (
                      <button
                        onClick={async () => {
                          if (await updateRequestStatus(selectedRequest.id, 'in_progress')) {
                            alert('Request marked as in progress');
                          }
                        }}
                        disabled={updateLoading}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {updateLoading ? 'Processing...' : 'Mark as In Progress'}
                      </button>
                    )}
                    {selectedRequest.status === 'in_progress' && (
                      <button
                        onClick={async () => {
                          if (await updateRequestStatus(selectedRequest.id, 'completed')) {
                            alert('Request marked as completed');
                          }
                        }}
                        disabled={updateLoading}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {updateLoading ? 'Processing...' : 'Mark as Completed'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScrapRequests;
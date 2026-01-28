import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/api';
import {
  FiArrowLeft,
  FiSearch,
  FiCalendar,
  FiFilter,
  FiEye,
  FiEdit2,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiMapPin,
  FiPackage,
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const ScrapRequests = () => {
  /* ================= STATE ================= */
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
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [editingWeights, setEditingWeights] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());

  /* ================= IMAGE URL ================= */
  const resolveImageUrl = useCallback((url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;

    const BASE_URL =
      import.meta.env.VITE_API_URL
        ?.replace('/api/v1', '')
        ?.replace('/api', '') ||
      'https://service.scrapexpress.co.in';

    return `${BASE_URL}/${url.replace(/^\/+/, '')}`;
  }, []);

  /* ================= DATE FORMAT ================= */
  const formatDateTime = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let timeAgo = '';
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        timeAgo = `${diffMins} min ago`;
      } else {
        timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      }
    } else if (diffDays < 7) {
      timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      timeAgo = d.toLocaleDateString('en-IN');
    }

    return (
      <div className="flex flex-col">
        <span className="font-medium">
          {d.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
        </span>
        <span className="text-xs text-gray-500">
          {d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
          })} • {timeAgo}
        </span>
      </div>
    );
  };

  /* ================= STATUS BADGE ================= */
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <FiClock className="mr-1" /> },
      approved: { color: 'bg-green-100 text-green-800', icon: <FiCheckCircle className="mr-1" /> },
      rejected: { color: 'bg-red-100 text-red-800', icon: <FiXCircle className="mr-1" /> },
      completed: { color: 'bg-blue-100 text-blue-800', icon: <FiCheckCircle className="mr-1" /> },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: <FiXCircle className="mr-1" /> }
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
      </span>
    );
  };

  /* ================= FETCH REQUESTS ================= */
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

      const res = await adminService.getAllRequests(params);

      if (res?.success) {
        const data = res.data;
        const processed = (data.requests || []).map(req => ({
          ...req,
          RequestItems: (req.RequestItems || []).map(item => ({
            ...item,
            RequestImages: (item.RequestImages || []).map(img => ({
              ...img,
              image_url: resolveImageUrl(img.image_url)
            }))
          }))
        }));
        setRequests(processed);
        setPagination(data.pagination);
      }
    } catch {
      setError('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filters.status, pagination.page]);

  /* ================= WEIGHT HELPERS ================= */
  const handleWeightChange = (itemId, field, value) => {
    setEditingWeights(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const calculateTotals = () => {
    if (!selectedRequest?.RequestItems) return { weight: 0, value: 0 };

    return selectedRequest.RequestItems.reduce(
      (acc, item) => {
        const weight =
          parseFloat(editingWeights[item.id]?.weight ?? item.weight ?? 0);
        const value =
          parseFloat(editingWeights[item.id]?.estimated_value ?? item.estimated_value ?? 0);

        acc.weight += weight;
        acc.value += value;
        return acc;
      },
      { weight: 0, value: 0 }
    );
  };

  /* ================= IMAGE RENDER ================= */
  const renderScrapImage = (image, idx, itemId) => {
    const id = `${itemId}-${idx}`;
    if (failedImages.has(id)) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400">
          <FiPackage className="w-8 h-8" />
        </div>
      );
    }

    return (
      <img
        src={resolveImageUrl(image.image_url)}
        alt="Scrap item"
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        loading="lazy"
        onError={() => setFailedImages(prev => new Set([...prev, id]))}
      />
    );
  };

  /* ================= FILTERS UI ================= */
  const FilterPanel = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent transition-colors"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Date
          </label>
          <div className="relative">
            <FiCalendar className="absolute left-3 top-3 text-gray-400" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To Date
          </label>
          <div className="relative">
            <FiCalendar className="absolute left-3 top-3 text-gray-400" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && fetchRequests()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
        <button
          onClick={() => {
            setFilters({
              status: 'all',
              search: '',
              startDate: '',
              endDate: ''
            });
            setShowFilters(false);
          }}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Clear Filters
        </button>
        <button
          onClick={fetchRequests}
          className="px-5 py-2.5 bg-[#017B83] text-white rounded-lg hover:bg-[#016a70] transition-colors flex items-center gap-2"
        >
          <FiSearch className="w-4 h-4" />
          Apply Filters
        </button>
      </div>
    </motion.div>
  );

  /* ================= LOADING SKELETON ================= */
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-48"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-24"></div>
          </div>
        </div>
      ))}
    </div>
  );

  /* ================= MAIN UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6">
      {/* ================= LIST VIEW ================= */}
      {viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Scrap Requests</h1>
              <p className="text-gray-600 mt-2">Manage and track all scrap collection requests</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <FiFilter className="w-4 h-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <button
                onClick={fetchRequests}
                className="p-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && <FilterPanel />}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center text-red-800">
                <FiXCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            </div>
          )}

          {/* Requests List */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FiPackage className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                <p className="text-gray-600">Try adjusting your filters or check back later</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Request Details
                        </th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {requests.map((req) => (
                        <motion.tr
                          key={req.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-5 px-6">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-[#017B83] to-[#016a70] rounded-lg flex items-center justify-center text-white font-bold">
                                {req.request_number?.slice(-3) || '---'}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {req.request_number || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {req.RequestItems?.length || 0} items
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <FiUser className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {req.User?.full_name || 'Unknown User'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {req.User?.phone || 'No phone'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-2 text-gray-700">
                              <FiMapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div className="text-sm">
                                {req.UserAddress?.city || 'Unknown location'}
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            {formatDateTime(req.createdAt || req.created_at)}
                          </td>
                          <td className="py-5 px-6">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="py-5 px-6">
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setViewMode('details');
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#017B83] to-[#019fa7] text-white rounded-lg hover:opacity-90 transition-opacity"
                            >
                              <FiEye className="w-4 h-4" />
                              View Details
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> requests
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <FiChevronLeft className="w-5 h-5" />
                    </button>
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={i}
                          onClick={() => setPagination({ ...pagination, page: pageNum })}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${pagination.page === pageNum
                              ? 'bg-[#017B83] text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <FiChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ================= DETAILS VIEW ================= */}
      {viewMode === 'details' && selectedRequest && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedRequest(null);
                setEditingWeights({});
              }}
              className="inline-flex items-center gap-2 text-[#017B83] hover:text-[#016a70] transition-colors mb-6"
            >
              <FiArrowLeft className="w-5 h-5" />
              Back to Requests
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedRequest.request_number}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={selectedRequest.status} />
                  <span className="text-sm text-gray-600">
                    Created {formatDateTime(selectedRequest.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <FiEdit2 className="w-4 h-4" />
                  Edit Request
                </button>
                <button className="px-5 py-2.5 bg-gradient-to-r from-[#017B83] to-[#019fa7] text-white rounded-lg hover:opacity-90 transition-opacity">
                  Update Status
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Info Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-100">
                  Customer Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                      <FiUser className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {selectedRequest.User?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-600">Customer</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FiUser className="w-4 h-4" />
                      </div>
                      <div className="text-sm">{selectedRequest.User?.phone || '—'}</div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FiMapPin className="w-4 h-4" />
                      </div>
                      <div className="text-sm">
                        {selectedRequest.UserAddress?.address_line1 || '—'}
                        <br />
                        {selectedRequest.UserAddress?.city && selectedRequest.UserAddress?.state
                          ? `${selectedRequest.UserAddress.city}, ${selectedRequest.UserAddress.state}`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-br from-[#017B83] to-[#019fa7] rounded-2xl p-6 text-white shadow-lg">
                <h3 className="text-lg font-semibold mb-6">Order Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/90">Total Items</span>
                    <span className="text-xl font-bold">
                      {selectedRequest.RequestItems?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/90">Total Weight</span>
                    <span className="text-xl font-bold">
                      {calculateTotals().weight.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="pt-4 border-t border-white/20">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Estimated Value</span>
                      <span className="text-2xl font-bold">
                        ₹{calculateTotals().value.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items & Images */}
            <div className="lg:col-span-2 space-y-6">
              {selectedRequest.RequestItems?.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-700 font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {item.Category?.name || 'Uncategorized'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} • Unit: {item.unit || 'pieces'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Current Weight & Value</div>
                      <div className="font-semibold text-gray-900">
                        {item.weight || 0} kg • ₹{item.estimated_value || 0}
                      </div>
                    </div>
                  </div>

                  {/* Weight Inputs */}
                  <div className="bg-gray-50 rounded-xl p-5 mb-6">
                    <h5 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <FiEdit2 className="w-4 h-4" />
                      Update Measurements
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Weight (kg)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter weight in kg"
                            value={editingWeights[item.id]?.weight ?? item.weight ?? ''}
                            onChange={(e) =>
                              handleWeightChange(item.id, 'weight', e.target.value)
                            }
                            className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent transition-colors"
                          />
                          <span className="absolute right-4 top-3 text-gray-500">kg</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estimated Value (₹)
                        </label>
                        <div className="relative">
                          <FiDollarSign className="absolute left-4 top-3.5 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter estimated value"
                            value={editingWeights[item.id]?.estimated_value ?? item.estimated_value ?? ''}
                            onChange={(e) =>
                              handleWeightChange(item.id, 'estimated_value', e.target.value)
                            }
                            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Images */}
                  {item.RequestImages?.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-4">Item Photos</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {item.RequestImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="aspect-square border border-gray-200 rounded-xl overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
                          >
                            <div className="relative w-full h-full">
                              {renderScrapImage(img, idx, item.id)}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-gray-900">Finalize Request</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Review and update the scrap measurements before proceeding
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setViewMode('list');
                    setSelectedRequest(null);
                    setEditingWeights({});
                  }}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button className="px-5 py-2.5 bg-gradient-to-r from-[#017B83] to-[#019fa7] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                  <FiCheckCircle className="w-5 h-5" />
                  Save & Update Request
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ScrapRequests;
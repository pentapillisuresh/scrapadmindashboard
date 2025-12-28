// components/ScrapRequests.jsx
import React, { useState } from 'react';

// Dummy requests data
const initialRequests = [
  {
    id: 'SCRP001',
    userId: 'USR001',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    userPhone: '+1 234 567 8900',
    address: '123 Main St, New York, NY 10001',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    categories: [
      { id: 1, name: 'Metal', photos: ['photo1.jpg', 'photo2.jpg'], weight: '5.2 kg' },
      { id: 5, name: 'Electronics', photos: ['photo3.jpg'], weight: '3.8 kg' }
    ],
    status: 'estimated',
    totalWeight: '9.0 kg',
    submittedAt: '2024-01-15 10:30:00',
    estimatedAt: '2024-01-15 14:45:00',
    completedAt: null
  },
  {
    id: 'SCRP002',
    userId: 'USR002',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    userPhone: '+1 234 567 8901',
    address: '456 Oak Ave, Los Angeles, CA 90001',
    coordinates: { lat: 34.0522, lng: -118.2437 },
    categories: [
      { id: 2, name: 'Plastic', photos: ['photo4.jpg'], weight: '2.5 kg' },
      { id: 3, name: 'Paper', photos: ['photo5.jpg', 'photo6.jpg'], weight: '4.3 kg' }
    ],
    status: 'submitted',
    totalWeight: '6.8 kg',
    submittedAt: '2024-01-15 11:15:00',
    estimatedAt: null,
    completedAt: null
  },
  {
    id: 'SCRP003',
    userId: 'USR003',
    userName: 'Bob Wilson',
    userEmail: 'bob@example.com',
    userPhone: '+1 234 567 8902',
    address: '789 Pine Rd, Chicago, IL 60601',
    coordinates: { lat: 41.8781, lng: -87.6298 },
    categories: [
      { id: 1, name: 'Metal', photos: ['photo7.jpg'], weight: '7.1 kg' },
      { id: 6, name: 'Wood', photos: ['photo8.jpg'], weight: '3.2 kg' }
    ],
    status: 'completed',
    totalWeight: '10.3 kg',
    submittedAt: '2024-01-14 09:45:00',
    estimatedAt: '2024-01-14 13:20:00',
    completedAt: '2024-01-15 10:15:00'
  },
  {
    id: 'SCRP004',
    userId: 'USR004',
    userName: 'Alice Brown',
    userEmail: 'alice@example.com',
    userPhone: '+1 234 567 8903',
    address: '321 Elm St, Houston, TX 77001',
    coordinates: { lat: 29.7604, lng: -95.3698 },
    categories: [
      { id: 4, name: 'Glass', photos: ['photo9.jpg', 'photo10.jpg', 'photo11.jpg'], weight: '8.7 kg' }
    ],
    status: 'submitted',
    totalWeight: '8.7 kg',
    submittedAt: '2024-01-15 08:20:00',
    estimatedAt: null,
    completedAt: null
  },
  {
    id: 'SCRP005',
    userId: 'USR005',
    userName: 'Charlie Davis',
    userEmail: 'charlie@example.com',
    userPhone: '+1 234 567 8904',
    address: '654 Maple Dr, Phoenix, AZ 85001',
    coordinates: { lat: 33.4484, lng: -112.0740 },
    categories: [
      { id: 5, name: 'Electronics', photos: ['photo12.jpg'], weight: '15.2 kg' }
    ],
    status: 'estimated',
    totalWeight: '15.2 kg',
    submittedAt: '2024-01-14 16:45:00',
    estimatedAt: '2024-01-15 09:30:00',
    completedAt: null
  }
];

const ScrapRequests = () => {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'details'
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWeights, setEditingWeights] = useState({});

  const filteredRequests = requests.filter(request => {
    if (filter !== 'all' && request.status !== filter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        request.id.toLowerCase().includes(term) ||
        request.userName.toLowerCase().includes(term) ||
        request.userEmail.toLowerCase().includes(term) ||
        request.address.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'estimated': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = (requestId, newStatus) => {
    const updatedRequests = requests.map(request => {
      if (request.id === requestId) {
        const update = { status: newStatus };
        if (newStatus === 'estimated') {
          update.estimatedAt = new Date().toLocaleString();
        } else if (newStatus === 'completed') {
          update.completedAt = new Date().toLocaleString();
        }
        return { ...request, ...update };
      }
      return request;
    });
    setRequests(updatedRequests);
  };

  const handleWeightUpdate = (requestId, categoryId, weight) => {
    const updatedRequests = requests.map(request => {
      if (request.id === requestId) {
        const updatedCategories = request.categories.map(cat => 
          cat.id === categoryId ? { ...cat, weight: weight } : cat
        );
        
        // Calculate new total weight
        const totalWeight = updatedCategories.reduce((sum, cat) => {
          const weightValue = parseFloat(cat.weight) || 0;
          return sum + weightValue;
        }, 0);
        
        return {
          ...request,
          categories: updatedCategories,
          totalWeight: `${totalWeight.toFixed(1)} kg`
        };
      }
      return request;
    });
    
    setRequests(updatedRequests);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setViewMode('details');
  };

  const handleCloseDetails = () => {
    setViewMode('list');
    setSelectedRequest(null);
    setEditingWeights({});
  };

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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2 border-b border-gray-200">
            {['all', 'submitted', 'estimated', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filter === status ? 'border-[#017B83] text-[#017B83]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} Requests
              </button>
            ))}
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.id}</div>
                        <div className="text-sm text-gray-500">{request.address.split(',')[0]}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.userName}</div>
                        <div className="text-sm text-gray-500">{request.userEmail}</div>
                        <div className="text-sm text-gray-500">{request.userPhone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {request.categories.map((cat, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {cat.name}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {request.categories.length} category(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.totalWeight}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="text-[#017B83] hover:text-teal-700 mr-3"
                        >
                          View Details
                        </button>
                        {request.status === 'submitted' && (
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'estimated')}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Mark Estimated
                          </button>
                        )}
                        {request.status === 'estimated' && (
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'completed')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* No Results */}
          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'No requests match the selected filter'}
              </p>
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
                    onClick={handleCloseDetails}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Request Details: {selectedRequest.id}</h1>
                    <p className="text-gray-600">Review photos and estimate weights</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedRequest.status)}`}>
                    Status: {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </span>
                  {selectedRequest.status === 'submitted' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedRequest.id, 'estimated');
                        setSelectedRequest({...selectedRequest, status: 'estimated'});
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Mark as Estimated
                    </button>
                  )}
                  {selectedRequest.status === 'estimated' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedRequest.id, 'completed');
                        setSelectedRequest({...selectedRequest, status: 'completed'});
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Mark as Completed
                    </button>
                  )}
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - User Info & Timeline */}
                <div className="lg:col-span-1 space-y-6">
                  {/* User Information Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <span className="font-medium text-gray-700">
                            {selectedRequest.userName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedRequest.userName}</p>
                          <p className="text-sm text-gray-600">{selectedRequest.userEmail}</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-sm">
                          <p className="text-gray-600">Phone Number</p>
                          <p className="font-medium text-gray-900">{selectedRequest.userPhone}</p>
                        </div>
                        <div className="text-sm mt-2">
                          <p className="text-gray-600">User ID</p>
                          <p className="font-medium text-gray-900">{selectedRequest.userId}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pickup Address</h3>
                    <div className="space-y-3">
                      <p className="text-gray-700">{selectedRequest.address}</p>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>GPS: {selectedRequest.coordinates.lat.toFixed(4)}, {selectedRequest.coordinates.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Timeline</h3>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className={`w-3 h-3 rounded-full mt-1 ${selectedRequest.status === 'completed' || selectedRequest.status === 'estimated' || selectedRequest.status === 'submitted' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">Submitted</p>
                          <p className="text-sm text-gray-600">{selectedRequest.submittedAt}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className={`w-3 h-3 rounded-full mt-1 ${selectedRequest.status === 'completed' || selectedRequest.status === 'estimated' ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">Estimated</p>
                          <p className="text-sm text-gray-600">
                            {selectedRequest.estimatedAt || 'Pending estimation'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className={`w-3 h-3 rounded-full mt-1 ${selectedRequest.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">Completed</p>
                          <p className="text-sm text-gray-600">
                            {selectedRequest.completedAt || 'Not completed yet'}
                          </p>
                        </div>
                      </div>
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
                      {selectedRequest.categories.map((category, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{category.name}</h4>
                                <p className="text-sm text-gray-600">{category.photos.length} photo(s) uploaded</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Estimated Weight</div>
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  value={category.weight}
                                  onChange={(e) => handleWeightUpdate(selectedRequest.id, category.id, e.target.value)}
                                  className="w-24 px-3 py-1 border border-gray-300 rounded text-right font-medium text-gray-900"
                                  placeholder="0.0 kg"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Photo Grid */}
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-900 mb-2">Uploaded Photos:</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {category.photos.map((photo, photoIdx) => (
                                <div key={photoIdx} className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Review Notes */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Admin Notes for {category.name}
                            </label>
                            <textarea
                              rows="2"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017B83] focus:border-transparent"
                              placeholder="Add notes about scrap condition, type, quantity..."
                            />
                          </div>
                        </div>
                      ))}

                      {/* Total Weight Summary */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">Total Estimated Weight</p>
                            <p className="text-sm text-gray-600">Sum of all category weights</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{selectedRequest.totalWeight}</p>
                            <p className="text-sm text-gray-600">
                              {selectedRequest.categories.length} categor{selectedRequest.categories.length === 1 ? 'y' : 'ies'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCloseDetails}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Back to List
                    </button>
                    {selectedRequest.status !== 'completed' && (
                      <button
                        onClick={() => {
                          if (selectedRequest.status === 'submitted') {
                            handleStatusUpdate(selectedRequest.id, 'estimated');
                          } else if (selectedRequest.status === 'estimated') {
                            handleStatusUpdate(selectedRequest.id, 'completed');
                          }
                          handleCloseDetails();
                        }}
                        className="px-6 py-3 bg-[#017B83] text-white rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        {selectedRequest.status === 'submitted' ? 'Save & Mark Estimated' : 'Save & Mark Completed'}
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
// components/DashboardHome.jsx
import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';

const DashboardHome = ({ setActiveTab }) => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    submittedRequests: 0,
    estimatedRequests: 0,
    completedRequests: 0,
    totalWeight: 0,
    averageWeight: 0,
    categoriesCount: 0,
    activeUsers: 0
  });

  const [recentRequests, setRecentRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats
      const statsResponse = await adminService.getDashboardStats();

      if (statsResponse.success) {
        const statsData = statsResponse.data;

        // Calculate total requests from status counts
        const statusCounts = statsData.status_counts || [];
        const totalRequests = statusCounts.reduce((sum, item) => sum + (parseInt(item.count) || 0), 0);

        // Extract counts by status
        const submittedRequests = statusCounts.find(item => item.status === 'pending')?.count || 0;
        const estimatedRequests = statusCounts.find(item => item.status === 'accepted')?.count || 0;
        const completedRequests = statusCounts.find(item => item.status === 'completed')?.count || 0;

        // Top categories count
        const categoriesCount = statsData.top_categories?.length || 0;

        // Calculate total weight from recent requests (this would need a separate endpoint for actual weight)
        // For now, using dummy calculation
        const totalWeight = totalRequests * 15; // Assuming average 15kg per request

        // Calculate average weight
        const averageWeight = totalRequests > 0 ? (totalWeight / totalRequests).toFixed(1) : 0;

        // Today's requests
        const todayRequests = parseInt(statsData.today_requests) || 0;

        // Update stats
        setStats({
          totalRequests,
          submittedRequests: parseInt(submittedRequests),
          estimatedRequests: parseInt(estimatedRequests),
          completedRequests: parseInt(completedRequests),
          totalWeight,
          averageWeight: parseFloat(averageWeight),
          categoriesCount,
          activeUsers: todayRequests // Using today's requests as active users for now
        });

        // Generate recent requests from stats data
        if (statsData.status_counts && statsData.status_counts.length > 0) {
          const recentRequestsData = statusCounts.slice(0, 5).map((item, index) => ({
            id: `SCRP${String(10000 + index).slice(-3)}`,
            user: `User ${index + 1}`,
            categories: Math.floor(Math.random() * 4) + 1,
            weight: `${(Math.random() * 30 + 5).toFixed(1)} kg`,
            status: item.status,
            time: `${Math.floor(Math.random() * 24)} hours ago`
          }));
          setRecentRequests(recentRequestsData);
        }
      }

      // Fetch all users
      const usersResponse = await adminService.getAllUsers();

      if (usersResponse.success && usersResponse.data) {
        setAllUsers(usersResponse.data);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');

      // Fallback to dummy data if API fails
      setStats({
        totalRequests: 156,
        submittedRequests: 24,
        estimatedRequests: 42,
        completedRequests: 90,
        totalWeight: 2450,
        averageWeight: 15.7,
        categoriesCount: 12,
        activeUsers: 89
      });

      setRecentRequests([
        { id: 'SCRP001', user: 'John Doe', categories: 3, weight: '18.5 kg', status: 'completed', time: '2 hours ago' },
        { id: 'SCRP002', user: 'Jane Smith', categories: 2, weight: '12.0 kg', status: 'estimated', time: '3 hours ago' },
        { id: 'SCRP003', user: 'Bob Wilson', categories: 4, weight: '25.3 kg', status: 'submitted', time: '5 hours ago' },
        { id: 'SCRP004', user: 'Alice Brown', categories: 1, weight: '8.7 kg', status: 'completed', time: '1 day ago' },
        { id: 'SCRP005', user: 'Charlie Davis', categories: 2, weight: '15.2 kg', status: 'estimated', time: '1 day ago' }
      ]);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Optional: Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Stats cards data
  const statCards = [
    {
      title: 'Total Requests',
      value: stats.totalRequests,
      change: '+12%',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'bg-blue-500'
    },
    {
      title: 'Submitted',
      value: stats.submittedRequests,
      change: '+5%',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'bg-yellow-500'
    },
    {
      title: 'Estimated',
      value: stats.estimatedRequests,
      change: '+18%',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: 'bg-purple-500'
    },
    {
      title: 'Completed',
      value: stats.completedRequests,
      change: '+8%',
      icon: 'M5 13l4 4L19 7',
      color: 'bg-green-500'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status) => {
    const statusMap = {
      'pending': 'Submitted',
      'accepted': 'Estimated',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#017B83] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800">Error Loading Dashboard</h3>
        </div>
        <p className="mt-2 text-red-700">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600">Monitor scrap collection requests and performance</p>
          <p className="text-sm text-gray-500 mt-1">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="flex space-x-2">
          {['day', 'week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${timeRange === range ? 'bg-[#017B83] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-600 text-sm font-medium">{card.change}</span>
                  <span className="text-gray-500 text-sm ml-2">from last {timeRange}</span>
                </div>
              </div>
              <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Scrap Requests</h3>

            <button
              onClick={() => setActiveTab('requests')}
              className="text-[#017B83] hover:text-teal-700 text-sm font-medium"
            >
              View all {allUsers.length} users →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categories</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{request.id}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-gray-700">
                            {request.user.charAt(0)}
                          </span>
                        </div>
                        <span className="text-gray-900">{request.user}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-900">{request.categories} categories</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{request.weight}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {formatStatus(request.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {request.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-lg font-bold text-gray-900">{stats.activeUsers}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Categories</p>
                  <p className="text-lg font-bold text-gray-900">{stats.categoriesCount}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Weight</p>
                  <p className="text-lg font-bold text-gray-900">{stats.totalWeight} kg</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Weight/Request</p>
                  <p className="text-lg font-bold text-gray-900">{stats.averageWeight} kg</p>
                </div>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Registered Users</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {allUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-gray-700">
                        {user.avatarInitial}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.full_name || 'No Name'}</p>
                      <p className="text-xs text-gray-500">{user.phone || 'No Phone'}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    User
                  </span>
                </div>
              ))}
              {allUsers.length === 0 && (
                <p className="text-gray-500 text-center py-4">No users found</p>
              )}
              {allUsers.length > 5 && (
                <div className="text-center">
                  <button className="text-[#017B83] hover:text-teal-700 text-sm font-medium">
                    View all {allUsers.length} users →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Request Status Distribution</h3>
        <div className="flex items-center justify-between">
          {[
            { status: 'Submitted', count: stats.submittedRequests, color: 'bg-yellow-500', key: 'pending' },
            { status: 'Estimated', count: stats.estimatedRequests, color: 'bg-purple-500', key: 'accepted' },
            { status: 'Completed', count: stats.completedRequests, color: 'bg-green-500', key: 'completed' }
          ].map((item, index) => {
            const percentage = stats.totalRequests > 0 ? (item.count / stats.totalRequests) * 100 : 0;
            return (
              <div key={index} className="text-center">
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${percentage * 3.77} 377`}
                      className={item.color.replace('bg-', 'text-')}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{item.count}</span>
                  </div>
                </div>
                <p className="mt-4 font-medium text-gray-900">{item.status}</p>
                <p className="text-sm text-gray-600">{percentage.toFixed(1)}% of total</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
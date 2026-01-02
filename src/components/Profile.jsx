// components/Profile.jsx
import React, { useState, useEffect } from 'react';
import { authService } from '../services/api';

const Profile = ({ user, onLogout }) => {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    createdAt: '',
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    email: '', // Add email field for API
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      // Get user info from authService
      const response = await authService.getUserInfo();
      if (response.data) {
        setProfileData({
          name: response.data.name || 'User',
          email: response.data.email || '',
          phone: response.data.phone || '',
          role: response.data.role || 'User',
          createdAt: response.data.createdAt || new Date().toISOString(),
        });
        
        // Pre-fill email in passwordData
        setPasswordData(prev => ({
          ...prev,
          email: response.data.email || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      // Fallback to mock data if API fails
      setProfileData({
        name: user?.name || 'Admin User',
        email: user?.email || 'admin@scrap.com',
        phone: '+1 (555) 123-4567',
        role: 'Administrator',
        createdAt: '2024-01-15',
      });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'New passwords do not match!'
      });
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long!'
      });
      return;
    }

    // Check if old password is provided
    if (!passwordData.oldPassword) {
      setMessage({
        type: 'error',
        text: 'Current password is required!'
      });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Prepare API request data
      const resetData = {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        email: passwordData.email || profileData.email
      };

      // Call reset-password API endpoint
      const response = await authService.resetPassword(resetData);
      
      if (response.success) {
        setMessage({
          type: 'success',
          text: response.message || 'Password changed successfully!'
        });
        
        // Reset password form
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
          email: passwordData.email, // Keep the email
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({
          type: 'error',
          text: response.message || 'Failed to change password. Please try again.'
        });
      }
    } catch (error) {
      console.error('Password change error:', error);
      
      // Handle specific error cases
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Invalid request data';
        } else if (error.response.status === 401) {
          errorMessage = 'Current password is incorrect or unauthorized';
        } else if (error.response.status === 404) {
          errorMessage = 'User not found';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        // Request was made but no response
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearForm = () => {
    setPasswordData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      email: passwordData.email, // Preserve email
    });
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#017B83] to-teal-600 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
              <span className="text-white text-3xl font-bold">
                {profileData.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profileData.name}</h1>
              <p className="text-teal-100">{profileData.email}</p>
              <div className="flex items-center mt-2 space-x-2">
                <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full">
                  {profileData.role}
                </span>
                <span className="text-white/80 text-sm">
                  Member since {new Date(profileData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Title for Change Password */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
          <p className="text-gray-600 mt-1">Update your password to keep your account secure</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`p-4 mx-6 mt-6 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className={`w-5 h-5 mr-2 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d={message.type === 'success' ? "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" : "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"} clipRule="evenodd" />
                </svg>
                <span className="font-medium">{message.text}</span>
              </div>
              <button 
                onClick={() => setMessage({ type: '', text: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Password Change Form */}
        <div className="p-6">
          <div className="max-w-2xl">
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Password Requirements</h4>
                  <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
                    <li>At least 6 characters long</li>
                    <li>Should include letters and numbers</li>
                    <li>Should not be easy to guess</li>
                    <li>New password must be different from current password</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handlePasswordChange}>
              <div className="space-y-6">
                {/* Hidden email field for API */}
                <input
                  type="hidden"
                  name="email"
                  value={passwordData.email || profileData.email}
                  readOnly
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent transition-colors"
                    placeholder="Enter your current password"
                    required
                    disabled={isLoading}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter your current password to verify your identity
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent transition-colors"
                    placeholder="Enter new password (min. 6 characters)"
                    required
                    disabled={isLoading}
                  />
                  {passwordData.newPassword && passwordData.newPassword.length < 6 && (
                    <p className="mt-1 text-sm text-red-600">
                      Password must be at least 6 characters long
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#017B83] focus:border-transparent transition-colors ${
                      passwordData.confirmPassword && 
                      passwordData.newPassword !== passwordData.confirmPassword
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="Confirm new password"
                    required
                    disabled={isLoading}
                  />
                  {passwordData.confirmPassword && 
                   passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      Passwords do not match
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleClearForm}
                    disabled={isLoading}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || 
                      !passwordData.oldPassword || 
                      !passwordData.newPassword || 
                      !passwordData.confirmPassword ||
                      passwordData.newPassword.length < 6 ||
                      passwordData.newPassword !== passwordData.confirmPassword}
                    className="px-6 py-2.5 bg-[#017B83] text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Changing...
                      </>
                    ) : 'Change Password'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
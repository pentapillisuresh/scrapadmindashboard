// src/App.jsx
import React, { useState, useEffect } from 'react';
import { authService } from './services/api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Check backend status on mount
  useEffect(() => {
    checkBackendStatus();
    loadUserFromStorage();
  }, []);

  const checkBackendStatus = async () => {
    try {
      // Try to ping the backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('http://localhost:5001/api/health', {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      console.log('Backend is offline, using mock mode');
      setBackendStatus('offline');
    }
  };

  const loadUserFromStorage = () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('scrapAdminUser');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        clearAuthData();
      }
    }
    setLoading(false);
  };

  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('scrapAdminUser');
    localStorage.removeItem('scrapAdminLoggedIn');
  };

  const handleLogin = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      
      if (response && response.token) {
        // Extract user data
        const userData = response.user || {
          email: credentials.email,
          name: response.full_name || credentials.email.split('@')[0],
          role: response.role || 'admin',
          id: response.id,
          phone: response.phone,
          full_name: response.full_name
        };
        
        // Save to localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('scrapAdminUser', JSON.stringify(userData));
        localStorage.setItem('scrapAdminLoggedIn', 'true');
        
        setUser(userData);
        setIsLoggedIn(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error.message || error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#017B83]"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Backend status indicator */}
      {backendStatus === 'offline' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Development Mode:</strong> Backend server is offline. Using mock authentication.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {!isLoggedIn ? (
        <Login 
          onLogin={handleLogin} 
          backendStatus={backendStatus}
        />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
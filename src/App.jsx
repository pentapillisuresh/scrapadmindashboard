// src/App.jsx
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // Load user data from localStorage on initial load
  useEffect(() => {
    const savedUser = localStorage.getItem('scrapAdminUser');
    const savedLoginState = localStorage.getItem('scrapAdminLoggedIn');
    
    if (savedUser && savedLoginState === 'true') {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (credentials) => {
    // Demo credentials check
    if (
      (credentials.email === 'admin@scrap.com' && credentials.password === 'admin123') ||
      (credentials.email === 'demo@scrap.com' && credentials.password === 'demo123')
    ) {
      const userData = { 
        email: credentials.email, 
        name: credentials.email === 'admin@scrap.com' ? 'Administrator' : 'Demo User',
        role: credentials.email === 'admin@scrap.com' ? 'Administrator' : 'Demo User'
      };
      
      setUser(userData);
      setIsLoggedIn(true);
      
      // Save to localStorage
      localStorage.setItem('scrapAdminUser', JSON.stringify(userData));
      localStorage.setItem('scrapAdminLoggedIn', 'true');
      
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    
    // Clear localStorage
    localStorage.removeItem('scrapAdminUser');
    localStorage.removeItem('scrapAdminLoggedIn');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import components to avoid SSR issues
const OptionsTable = dynamic(() => import('././components/OptionsTable'), { 
  ssr: false 
});

export default function Dashboard() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedSymbols, setSelectedSymbols] = useState(['SPY', 'QQQ', 'DIA']);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenStatus, setTokenStatus] = useState('checking');
  
  // For now, assume user access is granted
  const user = { username: 'Demo User' };

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('schwab_access_token') : null;
      if (token) {
        setAccessToken(token);
        setIsAuthenticated(true);
        setTokenStatus('valid');
      } else {
        setIsAuthenticated(false);
        setTokenStatus('invalid');
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setIsAuthenticated(false);
      setTokenStatus('error');
    }
  };

  const handleAuth = () => {
    window.location.href = '/api/schwab/auth';
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('schwab_access_token');
      localStorage.removeItem('schwab_refresh_token');
    }
    setAccessToken(null);
    setIsAuthenticated(false);
    setTokenStatus('invalid');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Options Dashboard
            </h1>
            <p className="text-gray-300 mb-4">
              Welcome to the professional options dashboard! 
            </p>
            <p className="text-gray-300 mb-8">
              Connect your Charles Schwab account to view high open interest options for SPY, QQQ, and DIA.
            </p>
            
            {tokenStatus === 'checking' && (
              <div className="mb-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Checking authentication status...</p>
              </div>
            )}
            
            <button
              onClick={handleAuth}
              disabled={tokenStatus === 'checking'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              {tokenStatus === 'checking' ? 'Checking...' : 'Connect Charles Schwab'}
            </button>
            
            <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm">
                <strong>Features:</strong> Auto-refresh tokens • Real-time data • Professional interface
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Options Dashboard
              </h1>
              <p className="text-sm text-gray-400">Professional Options Trading Interface</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400 flex items-center space-x-2">
                <span>Schwab Connected</span>
                <div className={`w-2 h-2 rounded-full ${
                  tokenStatus === 'valid' ? 'bg-green-500' : 
                  tokenStatus === 'refreshing' ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}></div>
              </div>
              
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
              >
                Disconnect Schwab
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-300 mb-4">
            High Open Interest Options
          </h2>
          <p className="text-gray-400 text-sm">
            Real-time data • Strikes ±$20 from current price • Next 3 weeks • Top 8 by OI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {selectedSymbols.map((symbol) => (
            <OptionsTable
              key={symbol}
              symbol={symbol}
              accessToken={accessToken}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Refresh Data
          </button>
        </div>
      </main>
    </div>
  );
}
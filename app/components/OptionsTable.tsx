'use client';

import { useState, useEffect } from 'react';

interface OptionsTableProps {
  symbol: string;
  accessToken: string | null;
}

export default function OptionsTable({ symbol, accessToken }: OptionsTableProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (symbol && accessToken) {
      fetchOptionsData();
    }
  }, [symbol, accessToken]);

  const fetchOptionsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/options/${symbol}`, {
        method: 'GET',
        headers: {
          'access_token': accessToken!,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch data: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      setData(result);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatOI = (oi: number) => {
    if (!oi || isNaN(oi)) return '0';
    if (oi >= 1000) {
      return (oi / 1000).toFixed(1) + 'k';
    }
    return oi.toString();
  };

  const getOIColor = (oi: number) => {
    if (!oi || isNaN(oi)) return '#9ca3af';
    if (oi >= 30000) return '#ef4444';
    if (oi >= 20000) return '#f97316';
    if (oi >= 10000) return '#eab308';
    if (oi >= 5000) return '#06b6d4';
    return '#9ca3af';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading {symbol}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <p className="text-red-400 font-bold mb-2">Error loading {symbol}</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button 
          onClick={fetchOptionsData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <p className="text-gray-400">No data available for {symbol}</p>
      </div>
    );
  }

  const totalCallOI = data?.calls?.reduce((sum: number, call: any) => sum + (call.openInterest || 0), 0) || 0;
  const totalPutOI = data?.puts?.reduce((sum: number, put: any) => sum + (put.openInterest || 0), 0) || 0;
  const currentPrice = data?.underlying?.price || 0;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      <div className="bg-gray-900 p-6 border-b border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-5xl font-bold text-white font-mono">
            {symbol}
          </h2>
          <div className="text-right">
            <div className="text-sm text-gray-400">Last</div>
            <div className="text-2xl font-bold text-white">
              ${currentPrice.toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between text-sm">
          <div>
            <span className="text-gray-400">Call OI: </span>
            <span className="text-cyan-400 font-bold">{formatOI(totalCallOI)}</span>
          </div>
          <div>
            <span className="text-gray-400">Put OI: </span>
            <span className="text-pink-400 font-bold">{formatOI(totalPutOI)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-4 py-3 text-left text-gray-300 font-semibold">C/P</th>
              <th className="px-4 py-3 text-center text-gray-300 font-semibold">Strike</th>
              <th className="px-4 py-3 text-right text-gray-300 font-semibold">Price</th>
              <th className="px-4 py-3 text-right text-gray-300 font-semibold">OI</th>
              <th className="px-4 py-3 text-center text-gray-300 font-semibold">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {data.calls?.map((option: any, index: number) => (
              <tr key={`call-${index}`} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <span className="bg-cyan-500 text-black px-2 py-1 rounded text-xs font-bold">
                    Call
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-white font-mono">
                  {option.strike}
                </td>
                <td className="px-4 py-3 text-right text-white font-mono">
                  {option.price?.toFixed(2) || 'N/A'}
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: getOIColor(option.openInterest) }}>
                  {formatOI(option.openInterest)}
                </td>
                <td className="px-4 py-3 text-center text-gray-300 font-mono">
                  {option.expiry}
                </td>
              </tr>
            ))}
            
            {data.puts?.map((option: any, index: number) => (
              <tr key={`put-${index}`} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <span className="bg-pink-500 text-white px-2 py-1 rounded text-xs font-bold">
                    Put
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-white font-mono">
                  {option.strike}
                </td>
                <td className="px-4 py-3 text-right text-white font-mono">
                  {option.price?.toFixed(2) || 'N/A'}
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: getOIColor(option.openInterest) }}>
                  {formatOI(option.openInterest)}
                </td>
                <td className="px-4 py-3 text-center text-gray-300 font-mono">
                  {option.expiry}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { symbol } = params;
    const accessToken = request.headers.get('access_token');
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    console.log(`Fetching options chain for ${symbol}...`);
    
    const today = new Date();
    const threeWeeksFromNow = new Date(today.getTime() + (21 * 24 * 60 * 60 * 1000));
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = threeWeeksFromNow.toISOString().split('T')[0];
    
    const url = `https://api.schwabapi.com/marketdata/v1/chains?` +
      `symbol=${symbol.toUpperCase()}&` +
      `contractType=ALL&` +
      `includeQuotes=true&` +
      `fromDate=${fromDate}&` +
      `toDate=${toDate}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({ 
        error: 'Failed to fetch options data',
        details: errorData
      }, { status: response.status });
    }

    const optionsData = await response.json();
    const processedData = processOptionsData(optionsData, symbol);
    
    return NextResponse.json(processedData);

  } catch (error) {
    console.error(`Options API error:`, error);
    return NextResponse.json({ 
      error: 'Failed to fetch options data',
      details: error.message
    }, { status: 500 });
  }
}

function processOptionsData(data, symbol) {
  const callMap = new Map();
  const putMap = new Map();
  
  const currentPrice = data.underlyingPrice || 0;
  const priceRange = 20;
  const minStrike = currentPrice - priceRange;
  const maxStrike = currentPrice + priceRange;
  
  const today = new Date();
  const threeWeeksFromNow = new Date(today.getTime() + (21 * 24 * 60 * 60 * 1000));
  
  if (data.callExpDateMap) {
    Object.keys(data.callExpDateMap).forEach(expDate => {
      const expDateObj = parseExpirationDate(expDate);
      if (!expDateObj || expDateObj > threeWeeksFromNow || expDateObj < today) return;
      
      Object.keys(data.callExpDateMap[expDate]).forEach(strike => {
        const strikePrice = parseFloat(strike);
        if (strikePrice <= currentPrice || strikePrice > maxStrike) return;
        
        const optionArray = data.callExpDateMap[expDate][strike];
        const option = Array.isArray(optionArray) ? optionArray[0] : optionArray;
        
        if (option && option.openInterest && option.openInterest > 50) {
          const optionData = {
            type: 'Call',
            strike: strikePrice,
            price: option.mark || option.last || 0,
            openInterest: option.openInterest,
            expiry: formatExpiry(expDate),
            expiryDate: expDateObj,
            impliedVolatility: option.volatility || 0,
          };
          
          const existing = callMap.get(strikePrice);
          if (!existing || option.openInterest > existing.openInterest) {
            callMap.set(strikePrice, optionData);
          }
        }
      });
    });
  }
  
  if (data.putExpDateMap) {
    Object.keys(data.putExpDateMap).forEach(expDate => {
      const expDateObj = parseExpirationDate(expDate);
      if (!expDateObj || expDateObj > threeWeeksFromNow || expDateObj < today) return;
      
      Object.keys(data.putExpDateMap[expDate]).forEach(strike => {
        const strikePrice = parseFloat(strike);
        if (strikePrice >= currentPrice || strikePrice < minStrike) return;
        
        const optionArray = data.putExpDateMap[expDate][strike];
        const option = Array.isArray(optionArray) ? optionArray[0] : optionArray;
        
        if (option && option.openInterest && option.openInterest > 50) {
          const optionData = {
            type: 'Put',
            strike: strikePrice,
            price: option.mark || option.last || 0,
            openInterest: option.openInterest,
            expiry: formatExpiry(expDate),
            expiryDate: expDateObj,
            impliedVolatility: option.volatility || 0,
          };
          
          const existing = putMap.get(strikePrice);
          if (!existing || option.openInterest > existing.openInterest) {
            putMap.set(strikePrice, optionData);
          }
        }
      });
    });
  }
  
  const allCalls = Array.from(callMap.values());
  const allPuts = Array.from(putMap.values());
  
  const topCalls = allCalls
    .sort((a, b) => b.openInterest - a.openInterest)
    .slice(0, 8)
    .sort((a, b) => a.strike - b.strike);
  
  const topPuts = allPuts
    .sort((a, b) => b.openInterest - a.openInterest)
    .slice(0, 8)
    .sort((a, b) => b.strike - a.strike);
  
  return {
    calls: topCalls,
    puts: topPuts,
    underlying: {
      symbol: symbol,
      price: currentPrice,
    }
  };
}

function parseExpirationDate(expDate) {
  try {
    let dateStr = expDate;
    if (expDate.includes(':')) {
      dateStr = expDate.split(':')[0];
    }
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
}

function formatExpiry(expDate) {
  try {
    let dateStr = expDate;
    if (expDate.includes(':')) {
      dateStr = expDate.split(':')[0];
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch (error) {
    return 'N/A';
  }
}

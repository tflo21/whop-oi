export default async function handler(req, res) {
	console.log('=== Options Endpoint Called ===');
	console.log('Method:', req.method);
	console.log('Symbol:', req.query.symbol);
	
	if (req.method !== 'GET') {
	  res.setHeader('Allow', ['GET']);
	  return res.status(405).json({ error: 'Method not allowed' });
	}
 
	const { symbol } = req.query;
	const accessToken = req.headers['access_token'];
	
	if (!accessToken) {
	  return res.status(401).json({ error: 'Access token required' });
	}
 
	if (!symbol) {
	  return res.status(400).json({ error: 'Symbol is required' });
	}
 
	try {
	  console.log(`Fetching options chain for ${symbol} using Market Data API...`);
	  
	  // Calculate date range (today + 3 weeks)
	  const today = new Date();
	  const threeWeeksFromNow = new Date(today.getTime() + (22 * 24 * 60 * 60 * 1000));
	  
	  const fromDate = today.toISOString().split('T')[0];
	  const toDate = threeWeeksFromNow.toISOString().split('T')[0];
	  
	  const url = `https://api.schwabapi.com/marketdata/v1/chains?` +
		 `symbol=${symbol.toUpperCase()}&` +
		 `contractType=ALL&` +
		 `includeQuotes=true&` +
		 `fromDate=${fromDate}&` +
		 `toDate=${toDate}`;
	  
	  console.log('API URL:', url);
	  
	  const response = await fetch(url, {
		 headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Accept': 'application/json',
		 },
	  });
 
	  console.log('Schwab Market Data API response status:', response.status);
	  
	  if (!response.ok) {
		 const errorData = await response.text();
		 console.error('Schwab Market Data API error:', errorData);
		 throw new Error(`HTTP ${response.status}: ${errorData}`);
	  }
 
	  const optionsData = await response.json();
	  console.log('Options data received for', symbol);
	  console.log('Underlying price:', optionsData.underlyingPrice);
	  
	  const processedData = processOptionsData(optionsData, symbol);
	  
	  res.status(200).json(processedData);
 
	} catch (error) {
	  console.error(`Options API error for ${symbol}:`, error);
	  res.status(500).json({ 
		 error: 'Failed to fetch options data',
		 details: error.message,
		 symbol: symbol
	  });
	}
 }
 
 function processOptionsData(data, symbol) {
	const callMap = new Map(); // Map to store highest OI for each strike
	const putMap = new Map();  // Map to store highest OI for each strike
	
	const currentPrice = data.underlyingPrice || 0;
	const priceRange = 20;
	const minStrike = currentPrice - priceRange;
	const maxStrike = currentPrice + priceRange;
	
	const today = new Date();
	const threeWeeksFromNow = new Date(today.getTime() + (21 * 24 * 60 * 60 * 1000));
	
	console.log('Current price:', currentPrice);
	console.log('Strike range for calls: >', currentPrice, 'up to', maxStrike);
	console.log('Strike range for puts: <', currentPrice, 'down to', minStrike);
	
	// Process call options - ONLY strikes ABOVE current price
	if (data.callExpDateMap) {
	  Object.keys(data.callExpDateMap).forEach(expDate => {
		 const expDateObj = parseExpirationDate(expDate);
		 if (!expDateObj || expDateObj > threeWeeksFromNow || expDateObj < today) {
			return;
		 }
		 
		 Object.keys(data.callExpDateMap[expDate]).forEach(strike => {
			const strikePrice = parseFloat(strike);
			
			// CALLS: Only strikes ABOVE current price
			if (strikePrice <= currentPrice || strikePrice > maxStrike) {
			  return;
			}
			
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
			  
			  // Keep only the highest OI for each strike
			  const existing = callMap.get(strikePrice);
			  if (!existing || option.openInterest > existing.openInterest) {
				 callMap.set(strikePrice, optionData);
			  }
			}
		 });
	  });
	}
	
	// Process put options - ONLY strikes BELOW current price
	if (data.putExpDateMap) {
	  Object.keys(data.putExpDateMap).forEach(expDate => {
		 const expDateObj = parseExpirationDate(expDate);
		 if (!expDateObj || expDateObj > threeWeeksFromNow || expDateObj < today) {
			return;
		 }
		 
		 Object.keys(data.putExpDateMap[expDate]).forEach(strike => {
			const strikePrice = parseFloat(strike);
			
			// PUTS: Only strikes BELOW current price
			if (strikePrice >= currentPrice || strikePrice < minStrike) {
			  return;
			}
			
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
			  
			  // Keep only the highest OI for each strike
			  const existing = putMap.get(strikePrice);
			  if (!existing || option.openInterest > existing.openInterest) {
				 putMap.set(strikePrice, optionData);
			  }
			}
		 });
	  });
	}
	
	// Convert maps to arrays and get top 8 by OI
	const allCalls = Array.from(callMap.values());
	const allPuts = Array.from(putMap.values());
	
	console.log(`Found ${allCalls.length} unique call strikes above $${currentPrice}`);
	console.log(`Found ${allPuts.length} unique put strikes below $${currentPrice}`);
	
	// Get top 8 calls by OI, then sort by strike ascending (closest to current price first)
	const topCalls = allCalls
	  .sort((a, b) => b.openInterest - a.openInterest)
	  .slice(0, 8)
	  .sort((a, b) => b.strike - a.strike); // FIXED: b - a for ascending (645→650→655...)
	
	// Get top 8 puts by OI, then sort by strike descending (closest to current price first)  
	const topPuts = allPuts
	  .sort((a, b) => a.openInterest - b.openInterest)
	  .slice(0, 8)
	  .sort((a, b) => b.strike - a.strike); // a - b for descending (640→635→630...)
	
	console.log('Top calls strikes (should be above current):', topCalls.map(c => c.strike));
	console.log('Top puts strikes (should be below current):', topPuts.map(p => p.strike));
	
	return {
	  calls: topCalls,
	  puts: topPuts,
	  underlying: {
		 symbol: symbol,
		 price: currentPrice,
	  },
	  priceRange: {
		 min: minStrike,
		 max: maxStrike,
		 current: currentPrice
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
	  console.error('Error parsing expiry date:', expDate, error);
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
	  if (isNaN(date.getTime())) {
		 return 'N/A';
	  }
	  
	  return `${date.getMonth() + 1}/${date.getDate()}`;
	} catch (error) {
	  console.error('Error formatting expiry:', expDate, error);
	  return 'N/A';
	}
 }
 
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    // Create Basic Auth header
    const credentials = Buffer.from(
      `${process.env.SCHWAB_CLIENT_ID}:${process.env.SCHWAB_CLIENT_SECRET}`
    ).toString('base64');

    // Prepare form data
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.SCHWAB_REDIRECT_URI,
    });

    console.log('Making token request to Schwab...');

    const response = await fetch('https://api.schwabapi.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: tokenParams.toString(),
    });

    const responseData = await response.json();
    console.log('Schwab response status:', response.status);

    if (!response.ok) {
      return NextResponse.json({
        error: 'Schwab API error',
        details: responseData
      }, { status: response.status });
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json({ 
      error: 'Token exchange failed',
      details: error.message
    }, { status: 500 });
  }
}
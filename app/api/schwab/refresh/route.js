import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { refresh_token } = await request.json();
    
    if (!refresh_token) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    const credentials = Buffer.from(
      `${process.env.SCHWAB_CLIENT_ID}:${process.env.SCHWAB_CLIENT_SECRET}`
    ).toString('base64');

    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    });

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

    if (!response.ok) {
      return NextResponse.json({
        error: 'Token refresh failed',
        details: responseData
      }, { status: response.status });
    }

    return NextResponse.json(responseData);

  } catch (error) {
    return NextResponse.json({ 
      error: 'Token refresh failed',
      details: error.message
    }, { status: 500 });
  }
}

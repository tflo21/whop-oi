import { NextResponse } from 'next/server';

export async function GET() {
  const authUrl = `https://api.schwabapi.com/v1/oauth/authorize?` +
    `client_id=${process.env.SCHWAB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.SCHWAB_REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=readonly`;
  
  return NextResponse.redirect(authUrl);
}
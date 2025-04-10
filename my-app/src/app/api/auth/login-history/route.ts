import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';

export const dynamic = 'force-dynamic';

// Create a Supabase Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to get user device information from user-agent
function getUserDeviceInfo(userAgent: string) {
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  
  return {
    browser: `${browser.name || 'Unknown'} ${browser.version || ''}`,
    os: `${os.name || 'Unknown'} ${os.version || ''}`,
    device: device.type ? `${device.vendor || ''} ${device.model || ''} (${device.type})` : 'Desktop'
  };
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Extract headers from the request object directly
    // The Request object has headers which is a standard Headers object
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = getUserDeviceInfo(userAgent);
    
    // Get client IP address from headers
    let ipAddress = 'Unknown';
    
    // Check for forwarded IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, the client is the first one
      ipAddress = forwardedFor.split(',')[0].trim();
    } else {
      // Try x-real-ip as fallback
      const realIp = request.headers.get('x-real-ip');
      if (realIp) {
        ipAddress = realIp;
      }
    }
    
    // Get approximate location from IP (this is simplified)
    let location = 'Unknown';
    // In a production app, you might want to use a geolocation service here

    console.log(`Recording login for user ${userId} from IP ${ipAddress} using ${deviceInfo.browser}`);

    // Insert login record
    const { data, error } = await supabaseAdmin
      .from('login_history')
      .insert([
        {
          user_id: userId,
          login_at: new Date().toISOString(),
          ip_address: ipAddress,
          device: `${deviceInfo.browser} on ${deviceInfo.os} (${deviceInfo.device})`,
          location: location
        }
      ])
      .select();

    if (error) {
      console.error('Error recording login history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in login history API:', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 
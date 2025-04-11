import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';

export const dynamic = 'force-dynamic';

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

    // Create a direct client with anon key - no auth needed for login history
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    
    // Extract headers from the request object directly
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

    try {
      // Try to use the RPC function first
      const { data, error } = await supabase.rpc('record_login_history', {
        p_user_id: userId,
        p_login_at: new Date().toISOString(),
        p_ip_address: ipAddress,
        p_device: `${deviceInfo.browser} on ${deviceInfo.os} (${deviceInfo.device})`,
        p_location: location
      });

      if (error) {
        console.error('Error using RPC function:', error);
        console.log('Falling back to direct insert...');
        
        // Fallback to direct insert
        const { data: insertData, error: insertError } = await supabase
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

        if (insertError) {
          console.error('Error recording login history:', insertError);
          // Log more detailed information for debugging
          console.log('Insert payload:', {
            user_id: userId,
            login_at: new Date().toISOString(),
            ip_address: ipAddress,
            device: `${deviceInfo.browser} on ${deviceInfo.os} (${deviceInfo.device})`,
            location: location
          });
          
          return NextResponse.json({ 
            error: insertError.message,
            details: insertError.details,
            code: insertError.code,
            hint: insertError.hint
          }, { status: 500 });
        }
        
        console.log('Login history recorded successfully via direct insert');
        return NextResponse.json({ success: true, data: insertData });
      }

      console.log('Login history recorded successfully via RPC');
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('Unexpected error in login history API:', error);
      return NextResponse.json({ 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in login history API:', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 
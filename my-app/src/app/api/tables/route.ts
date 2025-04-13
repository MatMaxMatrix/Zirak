import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Note: Table creation should ideally be done through migrations
// This endpoint should only be used during development
export async function GET() {
  try {
    // Use regular client - we will handle table creation through migrations or dashboard
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if the user is authenticated and authorized (should be an admin)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin privileges required' 
      }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tables should be created through migrations or the Supabase dashboard',
      note: 'For setup instructions, please consult the README.md file'
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to verify permissions' 
    }, { status: 500 });
  }
} 
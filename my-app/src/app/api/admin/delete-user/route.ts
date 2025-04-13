import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Function to create Supabase admin client
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key for admin operations.');
  }

  return createAdminClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Verify the current user is an admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Fetch user role from the database
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || !roleData || roleData.role !== 'admin') {
    console.warn(`[API DeleteUser] Unauthorized attempt by user: ${user.id}`);
    return NextResponse.json({ error: 'Forbidden: Requires admin privileges' }, { status: 403 });
  }

  // 2. Get the user ID to delete from the request body
  let userIdToDelete: string;
  try {
    const body = await request.json();
    userIdToDelete = body.userId;
    if (!userIdToDelete) {
      throw new Error('Missing userId in request body');
    }
  } catch (parseError) {
    console.error('[API DeleteUser] Error parsing request body:', parseError);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 3. Prevent admin from deleting themselves
  if (userIdToDelete === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  // 4. Perform the deletion using the admin client
  try {
    const supabaseAdmin = getAdminClient();
    console.log(`[API DeleteUser] Admin ${user.id} attempting to delete user ${userIdToDelete}`);
    
    const { data: deletionData, error: deletionError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
    
    if (deletionError) {
      console.error(`[API DeleteUser] Error deleting user ${userIdToDelete}:`, deletionError.message);
      return NextResponse.json(
        { error: deletionError.message || 'Failed to delete user' }, 
        { status: 500 }
      );
    }

    console.log(`[API DeleteUser] User ${userIdToDelete} deleted successfully by admin ${user.id}`);
    return NextResponse.json({ success: true, message: 'User deleted successfully' }, { status: 200 });
  
  } catch (adminError: any) {
    console.error('[API DeleteUser] Unexpected error during deletion:', adminError);
    // Handle potential error from getAdminClient()
    if (adminError.message.includes('Missing Supabase URL or Service Role Key')) {
        return NextResponse.json({ error: 'Server configuration error for admin operations.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
} 
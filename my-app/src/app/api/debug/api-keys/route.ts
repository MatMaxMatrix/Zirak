import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint for API keys
 * Used to diagnose and fix issues with API keys
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - No session found' }, { status: 401 });
    }

    const userId = session.user.id;

    // Log the user information
    console.log('Debug API Keys - User Info:', {
      id: userId,
      email: session.user.email,
      aud: session.user.aud,
      role: session.user.role
    });

    const results = {
      session: {
        userId: userId,
        userEmail: session.user.email
      },
      apiKeys: null,
      fixAttempt: null,
      error: null
    };

    // First - try to get API keys
    try {
      const { data: apiKeys, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        results.error = {
          message: `Error fetching API keys: ${error.message}`,
          code: error.code,
          details: error.details
        };
        console.error('Debug API Keys - Error fetching keys:', error);
      } else {
        results.apiKeys = apiKeys;
        console.log(`Debug API Keys - Found ${apiKeys?.length || 0} keys for user ${userId}`);
      }
    } catch (error) {
      results.error = {
        message: `Exception fetching API keys: ${error.message || JSON.stringify(error)}`
      };
      console.error('Debug API Keys - Exception:', error);
    }

    // If we encountered an error, try to fix RLS policy issues
    if (results.error) {
      try {
        // Try to fix RLS policy issues by granting explicit permission
        // This is a temporary fix done through the server-side route only
        const serverSupabase = await createClient();
        
        // First check if the table has the right structure
        const { data: tableInfo, error: tableError } = await serverSupabase
          .from('api_keys')
          .select('*')
          .limit(1);
          
        if (tableError) {
          results.fixAttempt = {
            status: 'Failed - Table structure issue',
            error: tableError
          };
        } else {
          // Now try to explicitly insert/update with the server client
          // Test insert using the server-side client bypassing RLS
          const testKey = {
            user_id: userId,
            key_name: 'test_key',
            key_prefix: 'test_',
            hashed_key: 'test_hash_' + Date.now(),
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const { data: insertData, error: insertError } = await serverSupabase
            .from('api_keys')
            .upsert([testKey])
            .select();
            
          if (insertError) {
            results.fixAttempt = {
              status: 'Failed - Insert test failed',
              error: insertError
            };
          } else {
            // Success - we created a test API key
            results.fixAttempt = {
              status: 'Success - Created test API key',
              testKeyId: insertData?.[0]?.id
            };
            
            // Now verify we can read it back with the regular client
            const { data: verifyData, error: verifyError } = await supabase
              .from('api_keys')
              .select('*')
              .eq('user_id', userId)
              .eq('key_name', 'test_key');
              
            if (verifyError) {
              results.fixAttempt.verifyStatus = 'Failed - Cannot read test key';
              results.fixAttempt.verifyError = verifyError;
            } else {
              results.fixAttempt.verifyStatus = 'Success - Can read test key';
              results.fixAttempt.verifyCount = verifyData?.length || 0;
              
              // Delete the test key if requested
              const shouldDelete = request.nextUrl.searchParams.get('cleanupTest') === 'true';
              if (shouldDelete && insertData?.[0]?.id) {
                const { error: deleteError } = await serverSupabase
                  .from('api_keys')
                  .delete()
                  .eq('id', insertData[0].id);
                  
                results.fixAttempt.cleanupStatus = deleteError 
                  ? `Failed: ${deleteError.message}` 
                  : 'Success';
              }
            }
          }
        }
      } catch (fixError) {
        results.fixAttempt = {
          status: 'Failed - Exception during fix attempt',
          error: fixError.message || JSON.stringify(fixError)
        };
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Debug API Keys - Global exception:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message || JSON.stringify(error)
    }, { status: 500 });
  }
} 
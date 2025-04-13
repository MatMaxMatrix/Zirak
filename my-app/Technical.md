# Debugging Supabase RLS Issues: API Key Management

This document details the troubleshooting process undertaken to resolve errors related to loading and saving user API keys within the application, specifically concerning Supabase Row Level Security (RLS) policies.

## Problem Summary

Users encountered errors when interacting with the API Key settings page (`/user-dashboard/profile/api-settings`):

1.  **Client-Side Errors:** Empty error objects (`{}`) were frequently logged in the browser console during operations like fetching existing keys (`fetchApiKeys`) or checking for existing keys before saving (`storeKey`). This indicated that the Supabase browser client was likely being blocked by RLS policies before receiving a detailed error message. Specific errors included:
    *   `Error checking API keys: {}` (on dashboard load)
    *   `Error fetching API keys: {}` (on API settings page load)
    *   `Error checking for existing openai API key: {}` (before saving)
    *   `Error saving openai API key: {}` (during save attempt)
2.  **Database-Level Errors:** Concurrently, or sometimes masked by the client errors, a specific database error occurred during save attempts:
    *   `Failed to save openai API key: infinite recursion detected in policy for relation "user_roles"`

This pointed towards a complex interaction between RLS policies on different tables.

## Debugging Steps & Analysis

1.  **Initial Code Review:** Examined the relevant frontend components (`api-settings/page.tsx`, `user-dashboard/page.tsx`), the backend API route (`/api/user/api-keys/route.ts`), and Supabase client setup (`/utils/supabase/client.ts`). This confirmed standard Supabase client usage but didn't immediately reveal the RLS conflict.
2.  **Enhanced Logging:** Added detailed `console.log` statements within the key functions (`checkApiKeys`, `fetchApiKeys`, `storeKey`) on the frontend to capture the exact point of failure and the content of the error objects returned by the Supabase client.
3.  **Debug Endpoint & UI:**
    *   Created a dedicated server-side debug API route (`/api/debug/api-keys/route.ts`) which used the Supabase server client (bypassing some RLS) to attempt reads/writes and report detailed results.
    *   Added a "Debug Mode" section to the `api-settings/page.tsx` UI to trigger this endpoint and display diagnostic information.
4.  **Identifying Infinite Recursion:** The "infinite recursion" error clearly indicated a circular dependency within the RLS policy evaluation.
5.  **RLS Policy Investigation:**
    *   Used SQL queries (`SELECT ... FROM pg_policies WHERE tablename = '...'`) to inspect the active RLS policies on `api_keys` and `user_roles`.
    *   Identified the use of a helper function (`is_admin()`) within several policies.
    *   Analyzed the definition of `is_admin()`, finding that it queried the `user_roles` table to determine admin status.
6.  **Hypothesizing the Loop:** Determined the likely cause of recursion:
    *   An operation on `api_keys` (or another table) triggered an RLS check involving `is_admin()`.
    *   `is_admin()` queried `user_roles`.
    *   Querying `user_roles` triggered its *own* RLS policies.
    *   An admin-related policy *on `user_roles`* (`Admins can manage all user_roles` or similar) *also* called `is_admin()` to check permission, creating the loop.
7.  **Iterative Policy Correction (SQL Scripts):**
    *   Attempted to fix the loop by redefining `is_admin()` to check JWT claims instead of querying `user_roles` (`fix_user_roles_recursion.sql`).
    *   Reverted `is_admin()` back to querying `user_roles` based on user preference, but modified the policies on `user_roles` to break the loop (`fix_user_roles_policy_and_function.sql`). This involved granting admin-level management of `user_roles` only to the `service_role`.
    *   Encountered dependency errors when dropping the `is_admin` function (`ERROR: 2BP01`), requiring the use of `DROP FUNCTION ... CASCADE`.
    *   Discovered that *multiple* older, conflicting admin policies (using subqueries) still existed on `user_roles` and were causing the recursion despite previous attempts.
    *   Created a final cleanup script (`cleanup_user_roles_policies.sql`) to explicitly `DROP` these specific problematic policies by name.
8.  **Verification:** Confirmed the correct, non-recursive set of policies were active on `user_roles` and `api_keys` using `pg_policies`.

## Root Cause

The core issue was a **circular dependency in Row Level Security policies**. An RLS policy check (triggered by accessing `api_keys` or other tables) depended on the `is_admin()` SQL function. This function queried the `user_roles` table. However, outdated RLS policies on the `user_roles` table *also* depended on querying `user_roles` (via subqueries or indirectly via `is_admin()`) to grant permissions, leading to infinite recursion during policy evaluation for certain operations. The client-side `{}` errors were likely caused by the initial RLS checks failing even for reads due to these complex/conflicting policies.

## Solution Implemented

1.  **Corrected `user_roles` RLS:** All conflicting and redundant policies on `user_roles` were dropped. The final, active policies are:
    *   `"Service role can manage all user roles"`: Grants `ALL` permissions to the `service_role` only.
    *   `"Users can view their own role"`: Grants `SELECT` permission for users on their own `user_id`.
2.  **Corrected `is_admin()` Function:** The `public.is_admin()` SQL function was defined to safely query the `public.user_roles` table, checking if `role = 'admin'` for the current `auth.uid()`. This is now safe because the policies on `user_roles` no longer create a recursive loop.
3.  **Corrected `api_keys` RLS:** Ensured the policies on `api_keys` allow users to manage their own keys (`USING (auth.uid() = user_id)`) and admins to manage all keys (`USING (public.is_admin())`). Redundant older admin policies were removed.

## Cleanup Performed

1.  Removed the temporary debug UI ("Debug Mode" button and display area) from `api-settings/page.tsx`.
2.  Removed the debug API endpoint (`/api/debug/api-keys/route.ts`).
3.  Commented out or removed verbose `console.log` statements added during debugging in `api-settings/page.tsx` and `user-dashboard/page.tsx`.
4.  Deleted numerous intermediate/redundant `.sql` fix scripts from `my-app/sql/`, keeping only essential setup scripts and the final successful fix/cleanup scripts.

## Key Files Involved

*   `my-app/src/app/user-dashboard/profile/api-settings/page.tsx` (UI, initial errors, debug UI added/removed)
*   `my-app/src/app/user-dashboard/page.tsx` (RLS check on load, logging added/removed)
*   `my-app/sql/fix_user_roles_policy_and_function.sql` (Final correct `is_admin()` and policy refresh)
*   `my-app/sql/cleanup_user_roles_policies.sql` (Final cleanup of bad `user_roles` policies)
*   `my-app/sql/create_api_keys_table.sql` (Defines `api_keys` table and final policies)
*   `my-app/api/debug/api-keys/route.ts` (Temporary debug endpoint, now deleted)
*   Various other `.sql` files (Created and subsequently deleted during cleanup)

## Key Concepts

*   **Supabase Row Level Security (RLS):** Database feature restricting row access based on policies.
*   **RLS Policies:** SQL rules defining `USING` (for SELECT/UPDATE/DELETE visibility) and `WITH CHECK` (for INSERT/UPDATE validation) conditions.
*   **`SECURITY DEFINER` Functions:** PostgreSQL functions that run with the privileges of the user who defined the function (often `postgres`), allowing them to bypass RLS *within the function's execution* but still subject to RLS when called from a user's query context unless carefully managed.
*   **Circular Dependencies/Infinite Recursion:** Occurs when policy checks depend on functions that query tables whose own policies depend back on the original function or table access.
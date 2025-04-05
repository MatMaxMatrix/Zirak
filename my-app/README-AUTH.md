# Auth0-Supabase Integration

This document outlines how Auth0 and Supabase are integrated in this application to provide authentication and authorization.

## Overview

- **Auth0**: Handles user authentication (login/logout)
- **Supabase**: Provides database with Row Level Security (RLS) policies
- **Integration**: Auth0 JWT tokens are used to authenticate with Supabase

## How it Works

1. User authenticates with Auth0
2. A custom JWT token is created with the user's Auth0 ID
3. This token is sent to Supabase with each request
4. Supabase RLS policies use the `auth.user_id()` function to restrict data access
5. Login events are automatically recorded in the login_history table

## Key Files

### Authentication

- `pages/api/auth/[...auth0].js`: Auth0 API routes with custom JWT token generation
- `pages/api/auth/token.js`: API endpoint to retrieve JWT token for client-side use
- `src/utils/supabase.ts`: Utility for creating Supabase clients with Auth0 tokens
- `src/components/auth/ProfileSync.tsx`: Component that syncs Auth0 user profiles to Supabase

### Database

- `sql/auth_functions.sql`: SQL function to extract user ID from JWT claims
- `sql/profiles.sql`: SQL schema for user profiles with RLS policies
- `sql/todos.sql`: SQL schema for todos with RLS policies
- `sql/login_history.sql`: SQL schema for tracking user login history

## Environment Variables

```
# Auth0
AUTH0_SECRET=
AUTH0_BASE_URL=
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_KEY=
```

## Row Level Security Policies

The application uses RLS policies to ensure users can only access their own data:

1. Profiles table: Users can only view, insert, and update their own profile
2. Todos table: Users can only view, insert, update, and delete their own todos
3. Login History table: Users can only view their own login history

## User Flow

1. User logs in via Auth0
2. ProfileSync component creates/updates the user profile in Supabase
3. Login event is recorded in the login_history table
4. User can now access their data with RLS protection

## Login History Feature

The application automatically tracks login history:

1. Each time a user logs in, a record is created in the `login_history` table using a SECURITY DEFINER function
2. The record includes:
   - User ID
   - Login timestamp
   - IP address
   - Device information
   - Geographic location (currently set to 'Unknown', can be enhanced with geolocation services)

### Implementation Details

The login history system relies on two key components:

1. The `record_user_login` SQL function in `sql/login_history.sql` that:
   - Runs with elevated privileges via SECURITY DEFINER
   - Checks for and creates the user profile if it doesn't exist
   - Records the login event in the login_history table
   
2. The Auth0 callback in `pages/api/auth/[...auth0].js` that:
   - Extracts device and IP information from the request
   - Calls the SQL function to record the login

### Setting Up Login History

To ensure login history tracking works:

1. Execute the SQL in `sql/login_history.sql` to create the table and functions
2. Set the `SUPABASE_SERVICE_KEY` environment variable with the service role key from Supabase dashboard
3. The login history will be automatically recorded after users log in 
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

## Key Files

### Authentication

- `pages/api/auth/[...auth0].js`: Auth0 API routes with custom JWT token generation
- `src/utils/supabase.ts`: Utility for creating Supabase clients with Auth0 tokens
- `src/components/auth/ProfileSync.tsx`: Component that syncs Auth0 user profiles to Supabase

### Database

- `sql/auth_functions.sql`: SQL function to extract user ID from JWT claims
- `sql/profiles.sql`: SQL schema for user profiles with RLS policies
- `sql/todos.sql`: SQL schema for todos with RLS policies

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
```

## Row Level Security Policies

The application uses RLS policies to ensure users can only access their own data:

1. Profiles table: Users can only view, insert, and update their own profile
2. Todos table: Users can only view, insert, update, and delete their own todos

## User Flow

1. User logs in via Auth0
2. ProfileSync component creates/updates the user profile in Supabase
3. User can now access their data with RLS protection

## Testing the Integration

1. Login with Auth0
2. Navigate to the Todos page
3. Create, view, update, and delete todos
4. These operations should work with proper RLS security 
# Supabase Database Setup

This folder contains all SQL scripts needed to set up your Supabase database.

## Setup Instructions

Run these SQL queries in your Supabase Dashboard → SQL Editor in the following order:

### 1. Initial Schema Setup
**File:** `schema.sql`

This creates all tables, RLS policies, and triggers for the application.

```bash
# Copy and run the entire contents of schema.sql in Supabase SQL Editor
```

### 2. Fix Existing Users (if needed)
**File:** `fix_existing_users.sql`

If you signed up before running the schema, you need to create profile records for existing users.

```bash
# Copy and run the entire contents of fix_existing_users.sql in Supabase SQL Editor
```

**Note:** Only run this if you get a `409 Conflict` error when uploading videos.

## Database Structure

### Tables
- **profiles** - User profile information (extends auth.users)
- **videos** - Video metadata and storage references
- **posts** - Platform-specific posts linked to videos

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic profile creation on user signup

## Troubleshooting

### 409 Conflict Error
This means your user doesn't have a profile record. Run `fix_existing_users.sql`.

### Permission Denied
Check that RLS policies are enabled and you're authenticated.

### Storage Upload Fails
Ensure the `FreeBucket` storage bucket exists and is public in Supabase Storage settings.

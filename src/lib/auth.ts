import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthResponse {
  user: User | null
  session: Session | null
  error: Error | null
}

export interface SignUpData {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface SignInData {
  email: string
  password: string
}

// Sign up a new user
export async function signUp({ email, password, firstName, lastName }: SignUpData): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      }
    }
  })

  return {
    user: data.user,
    session: data.session,
    error: error ? new Error(error.message) : null
  }
}

// Sign in with email and password
export async function signIn({ email, password }: SignInData): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  return {
    user: data.user,
    session: data.session,
    error: error ? new Error(error.message) : null
  }
}

// Sign in with magic link (passwordless)
export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  })

  return {
    error: error ? new Error(error.message) : null
  }
}

// Sign in with OAuth provider (Google, GitHub, etc.)
export async function signInWithProvider(provider: 'google' | 'github' | 'discord' | 'twitter'): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin
    }
  })

  return {
    error: error ? new Error(error.message) : null
  }
}

// Sign out the current user
export async function signOut(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signOut()

  return {
    error: error ? new Error(error.message) : null
  }
}

// Get the current user
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Get the current session
export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Reset password (sends reset email)
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })

  return {
    error: error ? new Error(error.message) : null
  }
}

// Update password (after reset)
export async function updatePassword(newPassword: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  return {
    error: error ? new Error(error.message) : null
  }
}

// Update user profile
export async function updateProfile(data: { firstName?: string; lastName?: string; avatarUrl?: string }): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.updateUser({
    data: {
      first_name: data.firstName,
      last_name: data.lastName,
      avatar_url: data.avatarUrl
    }
  })

  return {
    error: error ? new Error(error.message) : null
  }
}

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { signIn, signUp, signOut, signInWithProvider, signInWithMagicLink } from '@/lib/auth'
import type { User, Session } from '@supabase/supabase-js'

const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false
  })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Only set timeout if user is logged in
    if (authState.user) {
      timeoutRef.current = setTimeout(async () => {
        console.log('Session timeout due to inactivity')
        await signOut()
        window.location.href = '/login?timeout=true'
      }, INACTIVITY_TIMEOUT)
    }
  }, [authState.user])

  // Set up activity listeners for session timeout
  useEffect(() => {
    if (!authState.user) return

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      resetInactivityTimer()
    }

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Start initial timer
    resetInactivityTimer()

    return () => {
      // Clean up event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [authState.user, resetInactivityTimer])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
        initialized: true
      })
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event)
        setAuthState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false
        }))
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleSignUp = useCallback(async (email: string, password: string, firstName?: string, lastName?: string) => {
    setAuthState(prev => ({ ...prev, loading: true }))
    const result = await signUp({ email, password, firstName, lastName })
    setAuthState(prev => ({ ...prev, loading: false }))
    return result
  }, [])

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true }))
    const result = await signIn({ email, password })
    setAuthState(prev => ({ ...prev, loading: false }))
    return result
  }, [])

  const handleSignInWithMagicLink = useCallback(async (email: string) => {
    setAuthState(prev => ({ ...prev, loading: true }))
    const result = await signInWithMagicLink(email)
    setAuthState(prev => ({ ...prev, loading: false }))
    return result
  }, [])

  const handleSignInWithProvider = useCallback(async (provider: 'google' | 'github' | 'discord' | 'twitter') => {
    setAuthState(prev => ({ ...prev, loading: true }))
    const result = await signInWithProvider(provider)
    setAuthState(prev => ({ ...prev, loading: false }))
    return result
  }, [])

  const handleSignOut = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true }))
    const result = await signOut()
    setAuthState(prev => ({ ...prev, loading: false }))
    return result
  }, [])

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    initialized: authState.initialized,
    isAuthenticated: !!authState.user,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithMagicLink: handleSignInWithMagicLink,
    signInWithProvider: handleSignInWithProvider,
    signOut: handleSignOut
  }
}

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, auth } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      const { session } = await auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id, session.user.email)
      }
      setLoading(false)
    }
    
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id, session.user.email)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId, email = null) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (data && !error) {
      setProfile(data)
    } else if (error && error.code === 'PGRST116') {
      // Profile doesn't exist - create one with available info
      // This handles users who signed up via OAuth or before profile creation was added
      const userEmail = email || (await supabase.auth.getUser())?.data?.user?.email
      if (userEmail) {
        const { data: newProfile } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: userEmail,
            full_name: userEmail.split('@')[0], // Use email prefix as fallback name
            display_name: userEmail.split('@')[0]
          })
          .select()
          .single()

        if (newProfile) {
          setProfile(newProfile)
        }
      }
    }
  }

  const signUp = async (email, password, fullName) => {
    const { data, error } = await auth.signUp(email, password, fullName)
    if (error) throw error

    // Create user profile
    if (data.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          display_name: fullName.split(' ')[0]
        })
        .select()
        .single()

      if (profileError) {
        // Log profile creation error but don't block signup
        // Profile will be created on next sign-in via fetchProfile
        console.warn('Profile creation failed, will retry on next sign-in:', profileError.message)
      } else if (profileData) {
        setProfile(profileData)
      }
    }

    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await auth.signIn(email, password)
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (updates) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) throw error
    setProfile(data)
    return data
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

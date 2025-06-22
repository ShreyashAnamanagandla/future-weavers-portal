
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'mentor' | 'intern';
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  authStatus: 'pending' | 'approved' | 'new' | null;
  signInWithGoogle: () => Promise<{ error: any }>;
  verifyAccessCode: (code: string) => Promise<{ error: any; success?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<'pending' | 'approved' | 'new' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    console.log('useAuth: Setting up authentication listeners');

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('useAuth: Auth state changed:', event, 'User email:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user?.email) {
          // Use setTimeout to defer the database call and avoid potential deadlocks
          setTimeout(() => {
            if (mounted) {
              checkUserStatus(session.user.email!);
            }
          }, 0);
        } else {
          console.log('useAuth: No user session, clearing state');
          setProfile(null);
          setAuthStatus(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      console.log('useAuth: Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.email) {
        checkUserStatus(session.user.email!);
      } else {
        setLoading(false);
      }
    });

    return () => {
      console.log('useAuth: Cleaning up authentication listeners');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUserStatus = async (email: string) => {
    console.log('useAuth: Checking user status for:', email);
    setLoading(true);
    
    try {
      // First check if user has a profile (fully authenticated)
      console.log('useAuth: Checking for existing profile');
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      console.log('useAuth: Profile check result:', { existingProfile, profileError });

      if (existingProfile && !profileError) {
        console.log('useAuth: User has profile, fully authenticated');
        setProfile(existingProfile);
        setAuthStatus('approved');
        setLoading(false);
        return;
      }

      // Then check if user is approved (has access code)
      console.log('useAuth: Checking approved_users table');
      const { data: approvedUser, error: approvedError } = await supabase
        .from('approved_users')
        .select('email, full_name, role, access_code')
        .eq('email', email)
        .maybeSingle();

      console.log('useAuth: Approved user check result:', { approvedUser, approvedError });

      if (approvedUser && !approvedError) {
        console.log('useAuth: User is approved, needs access code verification');
        setAuthStatus('approved');
        setLoading(false);
        return;
      }

      // Then check if user is pending
      console.log('useAuth: Checking pending_users table');
      const { data: pendingUser, error: pendingError } = await supabase
        .from('pending_users')
        .select('email, full_name')
        .eq('email', email)
        .maybeSingle();

      console.log('useAuth: Pending user check result:', { pendingUser, pendingError });

      if (pendingUser && !pendingError) {
        console.log('useAuth: User is pending approval');
        setAuthStatus('pending');
        setLoading(false);
        return;
      }

      // If not found in any table, they're new
      console.log('useAuth: User is new, not found in any table');
      setAuthStatus('new');
      setLoading(false);
    } catch (err) {
      console.error('useAuth: Error checking user status:', err);
      setAuthStatus('new');
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    console.log('useAuth: Attempting Google sign in');
    const redirectUrl = `${window.location.origin}/auth`;
    console.log('useAuth: Using redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('useAuth: Google sign in error:', error);
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log('useAuth: Google OAuth initiated successfully');
    }

    return { error };
  };

  const verifyAccessCode = async (code: string) => {
    if (!user?.email) {
      const error = new Error('No authenticated user found');
      console.error('useAuth: No authenticated user for access code verification');
      toast({
        title: "Verification Failed",
        description: "Please sign in with Google first",
        variant: "destructive",
      });
      return { error };
    }

    console.log('useAuth: Verifying access code for:', user.email);
    
    try {
      // Verify the access code using the database function
      const { data: verificationResult, error: verifyError } = await supabase.rpc(
        'verify_user_login',
        { _email: user.email, _access_code: code }
      );

      console.log('useAuth: Verification result:', { verificationResult, verifyError });

      if (verifyError || !verificationResult || verificationResult.length === 0) {
        console.error('useAuth: Access code verification failed:', verifyError);
        toast({
          title: "Invalid Access Code",
          description: "The access code is invalid or doesn't match your account",
          variant: "destructive",
        });
        return { error: verifyError || new Error('Invalid access code') };
      }

      const { role, user_id, full_name } = verificationResult[0];
      console.log('useAuth: Access code verified, user details:', { role, user_id, full_name });

      // Update last login
      await supabase.rpc('update_last_login', { _email: user.email });

      // Create or update profile
      console.log('useAuth: Creating/updating profile');
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: full_name || user.user_metadata?.full_name || user.user_metadata?.name || null,
          role: role,
          avatar_url: user.user_metadata?.avatar_url || null,
        });

      if (profileError) {
        console.error('useAuth: Error updating profile:', profileError);
        return { error: profileError };
      }

      // Fetch the updated profile
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('useAuth: Profile fetch result:', { updatedProfile, fetchError });

      if (!fetchError && updatedProfile) {
        setProfile(updatedProfile);
        setAuthStatus('approved');
      }

      toast({
        title: "Welcome Back!",
        description: `Successfully logged in as ${role}.`,
      });

      return { error: null, success: true };
    } catch (err) {
      console.error('useAuth: Access code verification error:', err);
      toast({
        title: "Verification Failed",
        description: "An error occurred while verifying your access code",
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const signOut = async () => {
    console.log('useAuth: Signing out user');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setAuthStatus(null);
    
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    console.log('useAuth: Updating profile with:', updates);
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } else {
      console.error('useAuth: Profile update error:', error);
    }

    return { error };
  };

  // Debug logging for context state
  console.log('useAuth context state:', {
    user: !!user,
    userEmail: user?.email,
    profile: !!profile,
    authStatus,
    loading
  });

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      authStatus,
      signInWithGoogle,
      verifyAccessCode,
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


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
  bootstrapAdmin: () => Promise<{ success: boolean; data?: any; error?: string }>;
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

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
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
          setProfile(null);
          setAuthStatus(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.email) {
        checkUserStatus(session.user.email!);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUserStatus = async (email: string) => {
    setLoading(true);
    
    try {
      // First check if user has a profile (fully authenticated)
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile && !profileError) {
        setProfile(existingProfile);
        setAuthStatus('approved');
        setLoading(false);
        return;
      }

      // Then check if user is approved (has access code)
      const { data: approvedUser, error: approvedError } = await supabase
        .from('approved_users')
        .select('email, full_name, role, access_code')
        .eq('email', email)
        .maybeSingle();

      if (approvedUser && !approvedError) {
        setAuthStatus('approved');
        setLoading(false);
        return;
      }

      // Then check if user is pending
      const { data: pendingUser, error: pendingError } = await supabase
        .from('pending_users')
        .select('email, full_name')
        .eq('email', email)
        .maybeSingle();

      if (pendingUser && !pendingError) {
        setAuthStatus('pending');
        setLoading(false);
        return;
      }

      // If not found in any table, they're new
      setAuthStatus('new');
      setLoading(false);
    } catch (err) {
      setAuthStatus('new');
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const verifyAccessCode = async (code: string) => {
    if (!user?.email) {
      const error = new Error('No authenticated user found');
      toast({
        title: "Verification Failed",
        description: "Please sign in with Google first",
        variant: "destructive",
      });
      return { error };
    }
    
    try {
      // Verify the access code using the database function
      const { data: verificationResult, error: verifyError } = await supabase.rpc(
        'verify_user_login',
        { _email: user.email, _access_code: code }
      );

      if (verifyError || !verificationResult || verificationResult.length === 0) {
        toast({
          title: "Invalid Access Code",
          description: "The access code is invalid or doesn't match your account",
          variant: "destructive",
        });
        return { error: verifyError || new Error('Invalid access code') };
      }

      const { role, user_id, full_name } = verificationResult[0];

      // Update last login
      await supabase.rpc('update_last_login', { _email: user.email });

      // Create or update profile
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
        return { error: profileError };
      }

      // Fetch the updated profile
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

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
      toast({
        title: "Verification Failed",
        description: "An error occurred while verifying your access code",
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const signOut = async () => {
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
    }

    return { error };
  };

  // Bootstrap admin function - promotes first user to admin if no admin exists
  const bootstrapAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'No active session' };
      }

      const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }
      
      // If user was bootstrapped, update the profile state
      if (data?.bootstrapped && data?.profile) {
        setProfile(data.profile);
      }
      
      return { success: true, data };
    } catch (err) {
      return { success: false, error: 'Failed to check admin bootstrap' };
    }
  };

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
      bootstrapAdmin,
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

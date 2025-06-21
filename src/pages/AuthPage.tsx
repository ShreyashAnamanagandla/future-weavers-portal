
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthPage = () => {
  const [accessCode, setAccessCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmittingPending, setIsSubmittingPending] = useState(false);
  const { signInWithGoogle, verifyAccessCode, user, profile, loading, authStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if user is fully authenticated with profile
  useEffect(() => {
    if (!loading && user && profile) {
      console.log('User is fully authenticated, redirecting to home');
      navigate('/');
    }
  }, [user, profile, loading, navigate]);

  // Don't render if still loading
  if (loading) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center">
        <div className="text-loomero-text font-anta text-xl">Loading...</div>
      </div>
    );
  }

  // Don't render if user is fully authenticated
  if (user && profile) {
    return null;
  }

  const handleGoogleSignIn = async () => {
    console.log('Initiating Google sign in');
    await signInWithGoogle();
  };

  const handleSubmitPendingRequest = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "Please sign in with Google first",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmittingPending(true);
    console.log('Submitting pending request for:', user.email);
    
    try {
      const { error } = await supabase
        .from('pending_users')
        .insert({
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          google_id: user.id,
        });

      if (error) {
        console.error('Error submitting pending request:', error);
        toast({
          title: "Error",
          description: "Failed to submit access request. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('Successfully submitted pending request');
        toast({
          title: "Request Submitted",
          description: "Your access request has been submitted successfully.",
        });
        // Force a refresh of auth status by reloading
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      console.error('Error submitting pending request:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsSubmittingPending(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      return;
    }
    
    setIsVerifying(true);
    console.log('Verifying access code');

    const { error, success } = await verifyAccessCode(accessCode.trim());
    
    if (success) {
      console.log('Access code verified successfully');
      // Navigation will happen via useEffect when profile updates
    }
    
    setIsVerifying(false);
  };

  // Debug logging
  console.log('AuthPage state:', { user: !!user, authStatus, loading });

  return (
    <div className="min-h-screen bg-loomero-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-anta text-loomero-text">
            Welcome to LoomeroFlow
          </CardTitle>
          <CardDescription>
            {!user && "Sign in with Google to get started"}
            {user && authStatus === 'new' && "Complete your account setup"}
            {user && authStatus === 'pending' && "Your account is pending approval"}
            {user && authStatus === 'approved' && "Enter your access code to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!user && (
            <div className="space-y-4">
              <Button 
                onClick={handleGoogleSignIn}
                className="w-full"
                size="lg"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>
          )}

          {user && authStatus === 'new' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700">Signed in as {user.email}</span>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">Account Setup Required</p>
                    <p className="mb-3">Your account needs approval before you can access the platform. Click below to submit your request.</p>
                    <Button 
                      onClick={handleSubmitPendingRequest}
                      disabled={isSubmittingPending}
                      size="sm"
                    >
                      {isSubmittingPending ? 'Submitting...' : 'Request Access'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user && authStatus === 'pending' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700">Signed in as {user.email}</span>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Account Pending Approval</p>
                    <p>Your account is pending approval. You will receive an email once approved with your access code.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user && authStatus === 'approved' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700">Signed in as {user.email}</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="access-code">6-Digit Access Code</Label>
                <Input
                  id="access-code"
                  type="text"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  maxLength={6}
                  required
                  disabled={isVerifying}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-gray-500">
                  Enter the 6-digit code from your approval email
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={isVerifying || !accessCode.trim()}>
                {isVerifying ? 'Verifying...' : 'Verify Access Code'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;

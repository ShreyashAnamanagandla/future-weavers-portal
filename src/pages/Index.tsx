
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      // Redirect to appropriate dashboard based on role
      switch (profile.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'mentor':
          navigate('/mentor');
          break;
        case 'intern':
          navigate('/intern');
          break;
      }
    }
  }, [profile, navigate]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center font-anta text-loomero-text">Welcome to LoomeroFlow</CardTitle>
            <CardDescription className="text-center">
              Your comprehensive internship management platform
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-loomero-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-loomero-text font-anta mb-4">
            Welcome to LoomeroFlow
          </h1>
          <p className="text-xl text-loomero-text/70 mb-8">
            Redirecting you to your dashboard...
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

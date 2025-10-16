
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role) {
      // Redirect to appropriate dashboard based on role
      switch (role) {
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
  }, [role, navigate]);

  if (!role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 story-weave">
        <Card className="max-w-md loomero-warm-shadow">
          <CardHeader>
            <CardTitle className="text-center font-anta text-foreground">Welcome to LoomeroFlow</CardTitle>
            <CardDescription className="text-center">
              Your comprehensive internship management platform
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')} className="loomero-hero-gradient">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 story-weave">
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-foreground font-anta mb-4">
            Welcome to LoomeroFlow
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Redirecting you to your dashboard...
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

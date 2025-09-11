
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Award, Users, Clock, CheckCircle } from "lucide-react";
import BadgeAwardDialog from "@/components/BadgeAwardDialog";
import TaskAssignment from "@/components/TaskAssignment";
import LinkedInRecommendation from "@/components/LinkedInRecommendation";

interface PendingReview {
  id: string;
  submission_notes: string;
  submitted_at: string;
  milestones: {
    title: string;
    projects: {
      title: string;
    };
  };
  intern_profile: {
    full_name: string;
    email: string;
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  badge_type: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

const MentorDashboard = () => {
  const { profile } = useAuth();
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [interns, setInterns] = useState<User[]>([]);
  const [stats, setStats] = useState({
    totalInterns: 0,
    pendingReviews: 0,
    badgesAwarded: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      // Fetch pending reviews
      const { data: reviewsData } = await supabase
        .from('progress')
        .select(`
          *,
          milestones (
            title,
            projects (
              title
            )
          ),
          intern_profile:profiles!progress_intern_id_fkey (
            full_name,
            email
          )
        `)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true });

      // Fetch all badges for awarding
      const { data: badgesData } = await supabase
        .from('badges')
        .select('*')
        .order('name');

      // Fetch interns for badge awarding
      const { data: internsData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'intern');

      // Fetch stats
      const { data: allInterns } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'intern');

      const { data: allReviews } = await supabase
        .from('progress')
        .select('id')
        .eq('status', 'submitted');

      const { data: awardedBadges } = await supabase
        .from('user_badges')
        .select('id')
        .eq('awarded_by', profile.id);

      setPendingReviews(reviewsData || []);
      setBadges(badgesData || []);
      setInterns(internsData || []);
      setStats({
        totalInterns: allInterns?.length || 0,
        pendingReviews: allReviews?.length || 0,
        badgesAwarded: awardedBadges?.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center">
        <div className="text-loomero-text font-anta text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-loomero-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-loomero-text font-anta mb-2">
              Mentor Dashboard
            </h1>
            <p className="text-loomero-text/70">
              Welcome back, {profile?.full_name || 'Mentor'}! Manage intern progress and recognition.
            </p>
          </div>
          <Button onClick={() => setIsAwardDialogOpen(true)}>
            <Award className="h-4 w-4 mr-2" />
            Award Badge
          </Button>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">
                Total Interns
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{stats.totalInterns}</div>
              <p className="text-xs text-loomero-text/70 mt-1">
                Active mentees
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">
                Pending Reviews
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{stats.pendingReviews}</div>
              <p className="text-xs text-loomero-text/70 mt-1">
                Awaiting your feedback
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">
                Badges Awarded
              </CardTitle>
              <Award className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{stats.badgesAwarded}</div>
              <p className="text-xs text-loomero-text/70 mt-1">
                Recognition given
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Reviews */}
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-loomero-text font-anta">Pending Reviews</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/projects'}
                >
                  Review All
                </Button>
              </div>
              <CardDescription>Intern submissions awaiting your feedback</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingReviews.length > 0 ? (
                <div className="space-y-4">
                  {pendingReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex items-center justify-between p-3 bg-loomero-background/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-loomero-text">{review.milestones.title}</p>
                        <p className="text-xs text-loomero-text/70">
                          {review.intern_profile?.full_name} • {review.milestones.projects?.title}
                        </p>
                        <p className="text-xs text-loomero-text/60">
                          Submitted {new Date(review.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-yellow-500 text-white">
                        Review
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle className="h-12 w-12 text-loomero-text/40 mx-auto mb-2" />
                  <p className="text-loomero-text/70">No pending reviews</p>
                  <p className="text-sm text-loomero-text/60">All submissions have been reviewed</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <CardTitle className="text-loomero-text font-anta">Quick Actions</CardTitle>
              <CardDescription>Common mentoring tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.href = '/projects'}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Review Submissions
                </Button>
                <p className="text-sm text-loomero-text/70">Check and provide feedback on intern work</p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => setIsAwardDialogOpen(true)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Award Badges
                </Button>
                <p className="text-sm text-loomero-text/70">Recognize intern achievements and milestones</p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.href = '/badges'}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Badge System
                </Button>
                <p className="text-sm text-loomero-text/70">Explore available badges and recognition</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <TaskAssignment mode="mentor" />
          
          <LinkedInRecommendation mode="mentor" />
        </div>

        {/* Badge Award Dialog */}
        <BadgeAwardDialog
          isOpen={isAwardDialogOpen}
          onClose={() => setIsAwardDialogOpen(false)}
          badges={badges}
          users={interns}
          onBadgeAwarded={fetchDashboardData}
        />
      </div>
    </div>
  );
};

export default MentorDashboard;

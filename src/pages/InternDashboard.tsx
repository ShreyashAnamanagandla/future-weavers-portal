
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Award, BookOpen, CheckCircle, Clock } from "lucide-react";
import BadgeCard from "@/components/BadgeCard";

interface UserBadge {
  id: string;
  awarded_at: string;
  badges: {
    id: string;
    name: string;
    description: string;
    badge_type: 'milestone' | 'skill' | 'achievement' | 'completion';
    icon_url?: string;
  };
  awarded_by_profile: {
    full_name: string;
  };
}

interface Progress {
  id: string;
  status: string;
  milestones: {
    title: string;
    projects: {
      title: string;
    };
  };
}

const InternDashboard = () => {
  const { profile } = useAuth();
  const [recentBadges, setRecentBadges] = useState<UserBadge[]>([]);
  const [activeProgress, setActiveProgress] = useState<Progress[]>([]);
  const [stats, setStats] = useState({
    totalBadges: 0,
    totalProgress: 0,
    completedMilestones: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      // Fetch recent badges (last 3)
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges (*),
          awarded_by_profile:profiles!user_badges_awarded_by_fkey (
            full_name
          )
        `)
        .eq('user_id', profile.id)
        .order('awarded_at', { ascending: false })
        .limit(3);

      // Fetch active progress
      const { data: progressData } = await supabase
        .from('progress')
        .select(`
          *,
          milestones (
            title,
            projects (
              title
            )
          )
        `)
        .eq('intern_id', profile.id)
        .in('status', ['in_progress', 'submitted'])
        .order('created_at', { ascending: false });

      // Fetch stats
      const { data: allBadges } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', profile.id);

      const { data: allProgress } = await supabase
        .from('progress')
        .select('status')
        .eq('intern_id', profile.id);

      setRecentBadges(badgesData || []);
      setActiveProgress(progressData || []);
      setStats({
        totalBadges: allBadges?.length || 0,
        totalProgress: allProgress?.length || 0,
        completedMilestones: allProgress?.filter(p => p.status === 'approved').length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'submitted': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'submitted': return 'Under Review';
      case 'in_progress': return 'In Progress';
      default: return 'Pending';
    }
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-loomero-text font-anta mb-2">
            Welcome back, {profile?.full_name || 'Intern'}!
          </h1>
          <p className="text-loomero-text/70">
            Track your progress, achievements, and continue your learning journey.
          </p>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">
                Earned Badges
              </CardTitle>
              <Award className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{stats.totalBadges}</div>
              <p className="text-xs text-loomero-text/70 mt-1">
                Recognition earned
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">
                Completed Milestones
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{stats.completedMilestones}</div>
              <p className="text-xs text-loomero-text/70 mt-1">
                Out of {stats.totalProgress} total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">
                Active Tasks
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{activeProgress.length}</div>
              <p className="text-xs text-loomero-text/70 mt-1">
                In progress or under review
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Badges */}
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-loomero-text font-anta">Recent Badges</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/badges'}
                >
                  View All
                </Button>
              </div>
              <CardDescription>Your latest achievements and recognition</CardDescription>
            </CardHeader>
            <CardContent>
              {recentBadges.length > 0 ? (
                <div className="space-y-4">
                  {recentBadges.map((userBadge) => (
                    <div key={userBadge.id} className="flex items-center space-x-3 p-3 bg-loomero-background/50 rounded-lg">
                      <div className="flex-shrink-0">
                        {userBadge.badges.icon_url ? (
                          <img 
                            src={userBadge.badges.icon_url} 
                            alt={userBadge.badges.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Award className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-loomero-text">{userBadge.badges.name}</p>
                        <p className="text-xs text-loomero-text/70">
                          Awarded by {userBadge.awarded_by_profile?.full_name}
                        </p>
                      </div>
                      <div className="text-xs text-loomero-text/60">
                        {new Date(userBadge.awarded_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Award className="h-12 w-12 text-loomero-text/40 mx-auto mb-2" />
                  <p className="text-loomero-text/70">No badges earned yet</p>
                  <p className="text-sm text-loomero-text/60">Complete milestones to earn your first badge!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Progress */}
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-loomero-text font-anta">Active Progress</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/projects'}
                >
                  View Projects
                </Button>
              </div>
              <CardDescription>Your current milestones and tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {activeProgress.length > 0 ? (
                <div className="space-y-4">
                  {activeProgress.map((progress) => (
                    <div key={progress.id} className="flex items-center justify-between p-3 bg-loomero-background/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-loomero-text">{progress.milestones.title}</p>
                        <p className="text-xs text-loomero-text/70">
                          {progress.milestones.projects?.title}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(progress.status)} text-white`}>
                        {getStatusText(progress.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="h-12 w-12 text-loomero-text/40 mx-auto mb-2" />
                  <p className="text-loomero-text/70">No active tasks</p>
                  <p className="text-sm text-loomero-text/60">Check the projects page to start working on milestones</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InternDashboard;

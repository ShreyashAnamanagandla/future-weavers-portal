
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Award, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import BadgeCard from '@/components/BadgeCard';
import BadgeAwardDialog from '@/components/BadgeAwardDialog';

interface Badge {
  id: string;
  name: string;
  description: string;
  badge_type: 'milestone' | 'skill' | 'achievement' | 'completion';
  icon_url?: string;
  criteria?: string;
}

interface UserBadge {
  id: string;
  awarded_at: string;
  badge_id: string;
  badges: Badge;
  awarded_by_profile: {
    full_name: string;
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

const BadgesPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      // Fetch all badges
      const { data: badgesData, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .order('name');

      if (badgesError) throw badgesError;

      // Fetch user's badges if intern, or all user badges if admin/mentor
      let userBadgesData = [];
      if (profile.role === 'intern') {
        const { data, error } = await supabase
          .from('user_badges')
          .select(`
            *,
            badges (*),
            awarded_by_profile:profiles!user_badges_awarded_by_fkey (
              full_name
            )
          `)
          .eq('user_id', profile.id);
        
        if (error) throw error;
        userBadgesData = data || [];
      } else {
        const { data, error } = await supabase
          .from('user_badges')
          .select(`
            *,
            badges (*),
            user_profile:profiles!user_badges_user_id_fkey (
              full_name,
              email
            ),
            awarded_by_profile:profiles!user_badges_awarded_by_fkey (
              full_name
            )
          `);
        
        if (error) throw error;
        userBadgesData = data || [];
      }

      // Fetch users for awarding (if admin/mentor)
      let usersData = [];
      if (profile.role === 'admin' || profile.role === 'mentor') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('role', 'intern');
        
        if (error) throw error;
        usersData = data || [];
      }

      setBadges(badgesData || []);
      setUserBadges(userBadgesData);
      setUsers(usersData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch badge data",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const getStats = () => {
    if (profile?.role === 'intern') {
      const totalBadges = badges.length;
      const earnedBadges = userBadges.length;
      const progressPercentage = totalBadges > 0 ? (earnedBadges / totalBadges) * 100 : 0;
      
      return {
        totalBadges,
        earnedBadges,
        progressPercentage: Math.round(progressPercentage)
      };
    } else {
      const totalAwarded = userBadges.length;
      const uniqueUsers = new Set(userBadges.map(ub => ub.user_id)).size;
      
      return {
        totalAwarded,
        uniqueUsers,
        totalBadges: badges.length
      };
    }
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center">
        <div className="text-loomero-text font-anta text-xl">Loading badges...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-loomero-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-loomero-text font-anta mb-2">
              Badge System
            </h1>
            <p className="text-loomero-text/70">
              {profile?.role === 'intern' 
                ? 'Track your achievements and earned recognition'
                : 'Manage and award badges to recognize achievements'
              }
            </p>
          </div>
          {(profile?.role === 'admin' || profile?.role === 'mentor') && (
            <Button onClick={() => setIsAwardDialogOpen(true)}>
              <Award className="h-4 w-4 mr-2" />
              Award Badge
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {profile?.role === 'intern' ? (
            <>
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-loomero-text">
                    Earned Badges
                  </CardTitle>
                  <Award className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-loomero-text">{stats.earnedBadges}</div>
                  <p className="text-xs text-loomero-text/70">
                    Out of {stats.totalBadges} available
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-loomero-text">
                    Progress
                  </CardTitle>
                  <Award className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-loomero-text">{stats.progressPercentage}%</div>
                  <p className="text-xs text-loomero-text/70">
                    Completion rate
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-loomero-text">
                    Total Available
                  </CardTitle>
                  <Award className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-loomero-text">{stats.totalBadges}</div>
                  <p className="text-xs text-loomero-text/70">
                    Badges to earn
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-loomero-text">
                    Total Awarded
                  </CardTitle>
                  <Award className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-loomero-text">{stats.totalAwarded}</div>
                  <p className="text-xs text-loomero-text/70">
                    Badges given out
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-loomero-text">
                    Users with Badges
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-loomero-text">{stats.uniqueUsers}</div>
                  <p className="text-xs text-loomero-text/70">
                    Active achievers
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-loomero-text">
                    Available Badges
                  </CardTitle>
                  <Award className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-loomero-text">{stats.totalBadges}</div>
                  <p className="text-xs text-loomero-text/70">
                    Total badge types
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Tabs defaultValue="earned" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="earned">
              {profile?.role === 'intern' ? 'My Badges' : 'Awarded Badges'}
            </TabsTrigger>
            <TabsTrigger value="available">All Badges</TabsTrigger>
          </TabsList>

          <TabsContent value="earned" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {userBadges.map((userBadge) => (
                <BadgeCard
                  key={userBadge.id}
                  id={userBadge.badges.id}
                  name={userBadge.badges.name}
                  description={userBadge.badges.description}
                  badge_type={userBadge.badges.badge_type}
                  icon_url={userBadge.badges.icon_url}
                  awarded_at={userBadge.awarded_at}
                  awarded_by={userBadge.awarded_by_profile?.full_name}
                />
              ))}
            </div>
            {userBadges.length === 0 && (
              <Card className="bg-white border-loomero-accent/20">
                <CardContent className="text-center py-12">
                  <Award className="h-12 w-12 text-loomero-text/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-loomero-text mb-2">
                    {profile?.role === 'intern' ? 'No Badges Yet' : 'No Badges Awarded Yet'}
                  </h3>
                  <p className="text-loomero-text/70">
                    {profile?.role === 'intern' 
                      ? "Start completing milestones and projects to earn your first badge!"
                      : "Award badges to recognize intern achievements and progress."
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="available" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {badges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  id={badge.id}
                  name={badge.name}
                  description={badge.description}
                  badge_type={badge.badge_type}
                  icon_url={badge.icon_url}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Award Badge Dialog */}
        <BadgeAwardDialog
          isOpen={isAwardDialogOpen}
          onClose={() => setIsAwardDialogOpen(false)}
          badges={badges}
          users={users}
          onBadgeAwarded={fetchData}
        />
      </div>
    </div>
  );
};

export default BadgesPage;

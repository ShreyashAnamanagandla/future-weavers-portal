
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Award, BookOpen, Clock, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalInterns: number;
  totalProjects: number;
  totalBadges: number;
  completedMilestones: number;
  avgCompletionTime: number;
  projectProgress: Array<{
    projectName: string;
    completed: number;
    total: number;
    percentage: number;
  }>;
  badgeDistribution: Array<{
    type: string;
    count: number;
  }>;
  weeklyProgress: Array<{
    week: string;
    milestones: number;
    badges: number;
  }>;
  internPerformance: Array<{
    name: string;
    completedMilestones: number;
    badges: number;
    avgScore: number;
  }>;
}

const AnalyticsPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [profile, timeRange]);

  const fetchAnalytics = async () => {
    if (!profile) return;

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));

      // Fetch basic counts
      const [
        { count: totalInterns },
        { count: totalProjects },
        { count: totalBadges },
        { count: completedMilestones },
      ] = await Promise.all([
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'intern'),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('user_badges').select('*', { count: 'exact', head: true }),
        supabase.from('progress').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      ]);

      // Fetch project progress data
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          title,
          milestones (
            id,
            progress (
              status
            )
          )
        `);

      const projectProgress = projectsData?.map(project => {
        const totalMilestones = project.milestones?.length || 0;
        const completedMilestones = project.milestones?.filter(m => 
          m.progress?.some(p => p.status === 'approved')
        ).length || 0;
        
        return {
          projectName: project.title,
          completed: completedMilestones,
          total: totalMilestones,
          percentage: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
        };
      }) || [];

      // Fetch badge distribution
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select(`
          badges (
            badge_type
          )
        `);

      const badgeTypes = badgesData?.reduce((acc, item) => {
        const type = item.badges?.badge_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const badgeDistribution = Object.entries(badgeTypes).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count
      }));

      // Generate weekly progress (mock data for demo)
      const weeklyProgress = Array.from({ length: 4 }, (_, i) => ({
        week: `Week ${i + 1}`,
        milestones: Math.floor(Math.random() * 20) + 5,
        badges: Math.floor(Math.random() * 10) + 2
      }));

      // Fetch intern performance
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'intern');
      
      const internIds = userRolesData?.map(ur => ur.user_id) || [];
      
      const { data: internsData } = await supabase
        .from('profiles')
        .select(`
          full_name,
          progress (
            status
          ),
          user_badges (
            id
          )
        `)
        .in('id', internIds);

      const internPerformance = internsData?.map(intern => ({
        name: intern.full_name || 'Unknown',
        completedMilestones: intern.progress?.filter(p => p.status === 'approved').length || 0,
        badges: intern.user_badges?.length || 0,
        avgScore: Math.floor(Math.random() * 30) + 70 // Mock score
      })) || [];

      setAnalytics({
        totalInterns: totalInterns || 0,
        totalProjects: totalProjects || 0,
        totalBadges: totalBadges || 0,
        completedMilestones: completedMilestones || 0,
        avgCompletionTime: Math.floor(Math.random() * 10) + 5, // Mock data
        projectProgress,
        badgeDistribution,
        weeklyProgress,
        internPerformance
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center">
        <div className="text-loomero-text font-anta text-xl">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center">
        <div className="text-loomero-text font-anta text-xl">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-loomero-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-loomero-text font-anta mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-loomero-text/70">
              Comprehensive insights into internship program performance
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">Total Interns</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{analytics.totalInterns}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">Active Projects</CardTitle>
              <BookOpen className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{analytics.totalProjects}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">Badges Awarded</CardTitle>
              <Award className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{analytics.totalBadges}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">Completed Milestones</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{analytics.completedMilestones}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">Avg Completion</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">{analytics.avgCompletionTime} days</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-loomero-text">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loomero-text">+12%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader>
                  <CardTitle className="text-loomero-text">Weekly Progress Trend</CardTitle>
                  <CardDescription>Milestones completed and badges awarded over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.weeklyProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="milestones" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="badges" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white border-loomero-accent/20">
                <CardHeader>
                  <CardTitle className="text-loomero-text">Badge Distribution</CardTitle>
                  <CardDescription>Types of badges awarded</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.badgeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.badgeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card className="bg-white border-loomero-accent/20">
              <CardHeader>
                <CardTitle className="text-loomero-text">Project Completion Rates</CardTitle>
                <CardDescription>Progress across all active projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.projectProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="projectName" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="percentage" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="badges" className="space-y-6">
            <Card className="bg-white border-loomero-accent/20">
              <CardHeader>
                <CardTitle className="text-loomero-text">Badge Achievement Statistics</CardTitle>
                <CardDescription>Detailed breakdown of badge distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.badgeDistribution.map((badge, index) => (
                    <div key={badge.type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-loomero-text">{badge.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-loomero-text">{badge.count}</div>
                        <div className="text-sm text-loomero-text/70">badges awarded</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card className="bg-white border-loomero-accent/20">
              <CardHeader>
                <CardTitle className="text-loomero-text">Intern Performance Overview</CardTitle>
                <CardDescription>Individual intern achievements and progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.internPerformance.map((intern, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-loomero-text">{intern.name}</h3>
                        <p className="text-sm text-loomero-text/70">
                          {intern.completedMilestones} milestones • {intern.badges} badges
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-loomero-text">{intern.avgScore}%</div>
                        <div className="text-sm text-loomero-text/70">avg score</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsPage;

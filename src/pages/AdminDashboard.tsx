
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Award, FileText, Plus, FolderOpen } from "lucide-react";

const AdminDashboard = () => {
  const { profile } = useAuth();

  const stats = [
    {
      title: "Total Users",
      value: "156",
      description: "Active users in the system",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Projects",
      value: "12",
      description: "Current internship projects",
      icon: BookOpen,
      color: "text-green-600"
    },
    {
      title: "Badges Awarded",
      value: "342",
      description: "Recognition badges given",
      icon: Award,
      color: "text-yellow-600"
    },
    {
      title: "Certificates",
      value: "89",
      description: "Certificates issued",
      icon: FileText,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-loomero-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-loomero-text font-anta mb-2">
            Admin Dashboard
          </h1>
          <p className="text-loomero-text/70">
            Welcome back, {profile?.full_name || 'Admin'}! Here's your system overview.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-white border-loomero-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-loomero-text">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-loomero-text">{stat.value}</div>
                  <p className="text-xs text-loomero-text/70 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <CardTitle className="text-loomero-text font-anta">Quick Actions</CardTitle>
              <CardDescription>Manage your platform efficiently</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.href = '/projects'}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Manage Projects & Milestones
                </Button>
                <p className="text-sm text-loomero-text/70">Create and manage internship projects</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-loomero-text">User Management</h3>
                <p className="text-sm text-loomero-text/70">Create, edit, and manage user accounts and roles</p>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-loomero-text">Badge System</h3>
                <p className="text-sm text-loomero-text/70">Create and manage achievement badges</p>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <CardTitle className="text-loomero-text font-anta">Recent Activity</CardTitle>
              <CardDescription>Latest platform activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-loomero-text/70">New intern registered</p>
                  <span className="text-xs text-loomero-text/50 ml-auto">2 min ago</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-sm text-loomero-text/70">Project milestone completed</p>
                  <span className="text-xs text-loomero-text/50 ml-auto">1 hour ago</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <p className="text-sm text-loomero-text/70">Badge awarded to intern</p>
                  <span className="text-xs text-loomero-text/50 ml-auto">3 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

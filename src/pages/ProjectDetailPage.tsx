
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, CheckCircle, Clock, User, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  title: string;
  description: string;
  duration_weeks: number;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  order_index: number;
  due_date: string;
  created_at: string;
}

interface Progress {
  id: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  submission_notes: string;
  mentor_feedback: string;
  submitted_at: string;
  reviewed_at: string;
  milestone_id: string;
  intern_profile: {
    full_name: string;
  };
}

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    due_date: ''
  });

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    if (!id) return;

    // Fetch project details
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        profiles:created_by (
          full_name
        )
      `)
      .eq('id', id)
      .single();

    // Fetch milestones
    const { data: milestonesData, error: milestonesError } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', id)
      .order('order_index');

    // Fetch progress if user is admin or mentor
    let progressData = [];
    if (profile?.role === 'admin' || profile?.role === 'mentor') {
      const { data, error: progressError } = await supabase
        .from('progress')
        .select(`
          *,
          intern_profile:profiles!progress_intern_id_fkey (
            full_name
          )
        `)
        .in('milestone_id', milestonesData?.map(m => m.id) || []);
      progressData = data || [];
    }

    if (projectError || milestonesError) {
      toast({
        title: "Error",
        description: "Failed to fetch project data",
        variant: "destructive",
      });
    } else {
      setProject(projectData);
      setMilestones(milestonesData || []);
      setProgress(progressData);
    }
    setLoading(false);
  };

  const createMilestone = async () => {
    if (!id || !project) return;

    const nextOrderIndex = milestones.length + 1;

    const { error } = await supabase
      .from('milestones')
      .insert({
        ...newMilestone,
        project_id: id,
        order_index: nextOrderIndex,
        due_date: newMilestone.due_date || null
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create milestone",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Milestone created successfully",
      });
      setIsCreateMilestoneOpen(false);
      setNewMilestone({ title: '', description: '', due_date: '' });
      fetchProjectData();
    }
  };

  const getProgressCount = (milestoneId: string) => {
    return progress.filter(p => p.milestone_id === milestoneId).length;
  };

  const getCompletedCount = (milestoneId: string) => {
    return progress.filter(p => p.milestone_id === milestoneId && p.status === 'approved').length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center">
        <div className="text-loomero-text font-anta text-xl">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-loomero-text mb-2">Project Not Found</h3>
            <p className="text-loomero-text/70 mb-4">The project you're looking for doesn't exist.</p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-loomero-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-loomero-text font-anta">
              {project.title}
            </h1>
            <p className="text-loomero-text/70">
              Created by {project.profiles?.full_name || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <CardTitle className="text-loomero-text font-anta">Project Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-loomero-text/80 mb-4">{project.description}</p>
              <div className="space-y-2 text-sm text-loomero-text/70">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Duration: {project.duration_weeks} weeks</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <CardTitle className="text-loomero-text font-anta">Progress Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-loomero-text/70">Milestones</span>
                    <span className="text-sm font-medium text-loomero-text">{milestones.length}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-loomero-text/70">Total Submissions</span>
                    <span className="text-sm font-medium text-loomero-text">{progress.length}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-loomero-text/70">Completed</span>
                    <span className="text-sm font-medium text-loomero-text">
                      {progress.filter(p => p.status === 'approved').length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-loomero-accent/20">
            <CardHeader>
              <CardTitle className="text-loomero-text font-anta">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.role === 'admin' && (
                <div className="space-y-2">
                  <Button 
                    onClick={() => setIsCreateMilestoneOpen(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </div>
              )}
              {profile?.role === 'intern' && (
                <p className="text-sm text-loomero-text/70 text-center">
                  Track your progress through the milestones below
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-loomero-text font-anta">Milestones</h2>
          {profile?.role === 'admin' && (
            <Dialog open={isCreateMilestoneOpen} onOpenChange={setIsCreateMilestoneOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Milestone</DialogTitle>
                  <DialogDescription>
                    Add a new milestone for this project
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="milestone-title">Milestone Title</Label>
                    <Input
                      id="milestone-title"
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter milestone title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="milestone-description">Description</Label>
                    <Textarea
                      id="milestone-description"
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what needs to be accomplished"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="milestone-due-date">Due Date (Optional)</Label>
                    <Input
                      id="milestone-due-date"
                      type="date"
                      value={newMilestone.due_date}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                  <Button onClick={createMilestone} className="w-full">
                    Create Milestone
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <Card key={milestone.id} className="bg-white border-loomero-accent/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-loomero-hero text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <CardTitle className="text-loomero-text font-anta">
                        {milestone.title}
                      </CardTitle>
                      {milestone.due_date && (
                        <CardDescription className="flex items-center space-x-1 mt-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {new Date(milestone.due_date).toLocaleDateString()}</span>
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {profile?.role !== 'intern' && (
                      <Badge variant="secondary">
                        {getCompletedCount(milestone.id)}/{getProgressCount(milestone.id)} completed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-loomero-text/80 mb-4">{milestone.description}</p>
                {profile?.role === 'intern' && (
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = `/milestones/${milestone.id}`}
                  >
                    View Progress
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {milestones.length === 0 && (
          <Card className="bg-white border-loomero-accent/20">
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-loomero-text/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-loomero-text mb-2">No Milestones Yet</h3>
              <p className="text-loomero-text/70 mb-4">
                {profile?.role === 'admin' 
                  ? "Add milestones to structure this project and track intern progress."
                  : "Milestones will appear here once they are created by administrators."
                }
              </p>
              {profile?.role === 'admin' && (
                <Button onClick={() => setIsCreateMilestoneOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Milestone
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;


import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, Users, Clock, Edit, Trash2, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EditProjectDialog from '@/components/EditProjectDialog';
import DeleteProjectDialog from '@/components/DeleteProjectDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Project {
  id: string;
  title: string;
  description: string;
  duration_weeks: number;
  created_at: string;
  created_by: string;
  profiles: {
    full_name: string;
  };
}

const ProjectsPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    duration_weeks: 12
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        profiles:created_by (
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const createProject = async () => {
    if (!profile) return;

    const { error } = await supabase
      .from('projects')
      .insert({
        ...newProject,
        created_by: profile.id
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewProject({ title: '', description: '', duration_weeks: 12 });
      fetchProjects();
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-loomero-background flex items-center justify-center">
        <div className="text-loomero-text font-anta text-xl">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-loomero-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-loomero-text font-anta mb-2">
              Projects
            </h1>
            <p className="text-loomero-text/70">
              Manage internship projects and track progress
            </p>
          </div>
          
          {profile?.role === 'admin' && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Project</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new internship project with milestones
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      id="title"
                      value={newProject.title}
                      onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter project title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newProject.description}
                      onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the project objectives and goals"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (weeks)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newProject.duration_weeks}
                      onChange={(e) => setNewProject(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) }))}
                      min="1"
                      max="52"
                    />
                  </div>
                  <Button onClick={createProject} className="w-full">
                    Create Project
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="bg-white border-loomero-accent/20 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-loomero-text font-anta">
                  {project.title}
                </CardTitle>
                <CardDescription className="text-loomero-text/70">
                  Created by {project.profiles?.full_name || 'Unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-loomero-text/80 mb-4 line-clamp-3">
                  {project.description}
                </p>
                <div className="flex items-center justify-between text-sm text-loomero-text/60">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{project.duration_weeks} weeks</span>
                  </div>
                  <Badge variant="secondary">
                    Active
                  </Badge>
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.location.href = `/projects/${project.id}`}
                  >
                    View Details
                  </Button>
                  {profile?.role === 'admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditProject(project)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteProject(project)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {projects.length === 0 && (
          <Card className="bg-white border-loomero-accent/20">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-loomero-text/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-loomero-text mb-2">No Projects Yet</h3>
              <p className="text-loomero-text/70 mb-4">
                {profile?.role === 'admin' 
                  ? "Create your first project to get started with the internship program."
                  : "Projects will appear here once they are created by administrators."
                }
              </p>
              {profile?.role === 'admin' && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Project
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <EditProjectDialog
          project={selectedProject}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={fetchProjects}
        />

        <DeleteProjectDialog
          project={selectedProject}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onSuccess={fetchProjects}
        />
      </div>
    </div>
  );
};

export default ProjectsPage;

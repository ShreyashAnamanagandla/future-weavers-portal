import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, CheckCircle, Clock, AlertTriangle, Calendar, User, FileText } from 'lucide-react';

interface Task {
  id: string;
  milestone_id: string;
  intern_id: string;
  mentor_id: string;
  status: 'approved' | 'pending' | 'in_progress' | 'submitted' | 'rejected';
  submission_notes: string | null;
  mentor_feedback: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  milestones: {
    title: string;
    projects: {
      title: string;
    };
  };
  assigned_to_profile: {
    full_name: string;
    email: string;
  };
  assigned_by_profile: {
    full_name: string;
  } | null;
}

interface NewTask {
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  milestone_id: string;
  assigned_to: string;
}

interface TaskAssignmentProps {
  mode: 'mentor' | 'intern';
  internId?: string;
}

const TaskAssignment: React.FC<TaskAssignmentProps> = ({ mode, internId }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [interns, setInterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState<NewTask>({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    milestone_id: '',
    assigned_to: internId || ''
  });

  useEffect(() => {
    fetchData();
  }, [profile, mode, internId]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      // Fetch tasks based on mode
      let taskQuery = supabase
        .from('progress') // Using progress table as task equivalent
        .select(`
          *,
          milestones(title, projects(title)),
          assigned_to_profile:profiles!progress_intern_id_fkey(full_name, email),
          assigned_by_profile:profiles!progress_mentor_id_fkey(full_name)
        `);

      if (mode === 'mentor') {
        taskQuery = taskQuery.eq('mentor_id', profile.id);
        if (internId) taskQuery = taskQuery.eq('intern_id', internId);
      } else {
        taskQuery = taskQuery.eq('intern_id', profile.id);
      }

      const { data: tasksData } = await taskQuery.order('created_at', { ascending: false });

      // Fetch milestones for task creation
      if (mode === 'mentor') {
        const { data: milestonesData } = await supabase
          .from('milestones')
          .select(`
            *,
            projects(title)
          `)
          .order('title');

        setMilestones(milestonesData || []);

        // Fetch interns for task assignment
        if (!internId) {
          const { data: internsData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'intern');

          setInterns(internsData || []);
        }
      }

      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!profile || !newTask.title.trim() || !newTask.milestone_id || !newTask.assigned_to) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('progress')
        .insert({
          milestone_id: newTask.milestone_id,
          intern_id: newTask.assigned_to,
          mentor_id: profile.id,
          status: 'pending' as const,
          submission_notes: `Task: ${newTask.title}\n\nDescription: ${newTask.description}\n\nDue Date: ${newTask.due_date}\nPriority: ${newTask.priority}`
        });

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-milestone-notification', {
          body: {
            type: 'task_assigned',
            internId: newTask.assigned_to,
            mentorId: profile.id,
            taskTitle: newTask.title,
            taskDescription: newTask.description,
            dueDate: newTask.due_date,
            priority: newTask.priority
          }
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      toast({
        title: "Task Created",
        description: "Task has been assigned successfully and notification sent.",
      });

      setNewTask({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        milestone_id: '',
        assigned_to: internId || ''
      });
      setShowCreateForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'approved' | 'pending' | 'in_progress' | 'submitted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('progress')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Updated",
        description: "Task status has been updated successfully.",
      });

      fetchData();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'submitted': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'pending': return 'bg-gray-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'rejected': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-loomero-accent/20">
        <CardContent className="p-6">
          <div className="text-center text-loomero-text/70">Loading tasks...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {mode === 'mentor' && (
        <Card className="bg-white border-loomero-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-loomero-text font-anta flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Assign New Task</span>
                </CardTitle>
                <CardDescription>Create and assign tasks to interns</CardDescription>
              </div>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant={showCreateForm ? "secondary" : "default"}
              >
                {showCreateForm ? 'Cancel' : 'New Task'}
              </Button>
            </div>
          </CardHeader>
          
          {showCreateForm && (
            <CardContent className="space-y-4 border-t border-loomero-accent/20 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-loomero-text">Task Title</label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-loomero-text">Priority</label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      setNewTask(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-loomero-text">Milestone</label>
                  <Select
                    value={newTask.milestone_id}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, milestone_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select milestone" />
                    </SelectTrigger>
                    <SelectContent>
                      {milestones.map((milestone) => (
                        <SelectItem key={milestone.id} value={milestone.id}>
                          {milestone.title} - {milestone.projects?.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!internId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-loomero-text">Assign to Intern</label>
                    <Select
                      value={newTask.assigned_to}
                      onValueChange={(value) => setNewTask(prev => ({ ...prev, assigned_to: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select intern" />
                      </SelectTrigger>
                      <SelectContent>
                        {interns.map((intern) => (
                          <SelectItem key={intern.id} value={intern.id}>
                            {intern.full_name} ({intern.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-loomero-text">Due Date</label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-loomero-text">Description</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the task requirements and deliverables..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={createTask}
                disabled={creating || !newTask.title.trim() || !newTask.milestone_id || !newTask.assigned_to}
                className="w-full"
              >
                {creating ? 'Creating Task...' : 'Assign Task'}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      <Card className="bg-white border-loomero-accent/20">
        <CardHeader>
          <CardTitle className="text-loomero-text font-anta flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{mode === 'mentor' ? 'Assigned Tasks' : 'My Tasks'}</span>
          </CardTitle>
          <CardDescription>
            {mode === 'mentor' ? 'Tasks you\'ve assigned to interns' : 'Tasks assigned to you'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-loomero-text/40 mx-auto mb-2" />
              <p className="text-loomero-text/70">No tasks found</p>
              <p className="text-sm text-loomero-text/60">
                {mode === 'mentor' 
                  ? 'Create your first task assignment'
                  : 'No tasks have been assigned to you yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border border-loomero-accent/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-loomero-text">{task.milestones.title}</h4>
                      <p className="text-sm text-loomero-text/70">{task.milestones.projects?.title}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getStatusColor(task.status)} text-white`}>
                        {getStatusIcon(task.status)}
                        <span className="ml-1">{task.status}</span>
                      </Badge>
                    </div>
                  </div>

                  {task.submission_notes && (
                    <div className="bg-loomero-background/50 p-3 rounded-lg">
                      <p className="text-sm text-loomero-text/80 whitespace-pre-line">{task.submission_notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-loomero-text/70">
                    <div className="flex items-center space-x-4">
                      {mode === 'mentor' && (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{task.assigned_to_profile?.full_name}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {mode === 'intern' && task.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                      >
                        Start Task
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskAssignment;
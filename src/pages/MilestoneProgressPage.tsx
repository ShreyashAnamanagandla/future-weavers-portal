
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, CheckCircle, Clock, FileText, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CertificateGenerator } from '@/components/CertificateGenerator';
import { LinkedInPostGenerator } from '@/components/LinkedInPostGenerator';

interface Milestone {
  id: string;
  title: string;
  description: string;
  due_date: string;
  projects: {
    id: string;
    title: string;
  };
}

interface Progress {
  id: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  submission_notes: string;
  mentor_feedback: string;
  submitted_at: string;
  reviewed_at: string;
  intern_id: string;
  mentor_id: string;
}

const MilestoneProgressPage = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [mentorFeedback, setMentorFeedback] = useState('');
  const [userBadges, setUserBadges] = useState<Array<any>>([]);

  useEffect(() => {
    if (id) {
      fetchMilestoneData();
      if (profile?.role === 'intern') {
        fetchUserBadges();
      }
    }
  }, [id, profile]);

  const fetchUserBadges = async () => {
    if (!profile?.id) return;
    
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        id,
        badges (
          id,
          name,
          badge_type
        )
      `)
      .eq('user_id', profile.id);

    if (!error && data) {
      setUserBadges(data.map(item => item.badges).filter(Boolean));
    }
  };

  const fetchMilestoneData = async () => {
    if (!id) return;

    // Fetch milestone details
    const { data: milestoneData, error: milestoneError } = await supabase
      .from('milestones')
      .select(`
        *,
        projects (
          id,
          title
        )
      `)
      .eq('id', id)
      .single();

    // Fetch progress for current user (if intern) or all progress (if mentor/admin)
    let progressQuery = supabase
      .from('progress')
      .select('*')
      .eq('milestone_id', id);

    if (profile?.role === 'intern') {
      progressQuery = progressQuery.eq('intern_id', profile.id);
    }

    const { data: progressData, error: progressError } = await progressQuery.maybeSingle();

    if (milestoneError) {
      toast({
        title: "Error",
        description: "Failed to fetch milestone data",
        variant: "destructive",
      });
    } else {
      setMilestone(milestoneData);
      setProgress(progressData);
      if (progressData) {
        setSubmissionNotes(progressData.submission_notes || '');
        setMentorFeedback(progressData.mentor_feedback || '');
      }
    }
    setLoading(false);
  };

  const startProgress = async () => {
    if (!id || !profile || profile.role !== 'intern') return;

    const { error } = await supabase
      .from('progress')
      .insert({
        intern_id: profile.id,
        milestone_id: id,
        status: 'in_progress'
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to start progress tracking",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Progress tracking started",
      });
      fetchMilestoneData();
    }
  };

  const updateSubmission = async () => {
    if (!progress || !profile || profile.role !== 'intern') return;

    const { error } = await supabase
      .from('progress')
      .update({
        submission_notes: submissionNotes,
        status: submissionNotes.trim() ? 'submitted' : 'in_progress',
        submitted_at: submissionNotes.trim() ? new Date().toISOString() : null
      })
      .eq('id', progress.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update submission",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: submissionNotes.trim() ? "Submission updated" : "Progress saved",
      });
      fetchMilestoneData();
    }
  };

  const updateMentorFeedback = async (newStatus: 'approved' | 'rejected') => {
    if (!progress || !profile || (profile.role !== 'mentor' && profile.role !== 'admin')) return;

    const { error } = await supabase
      .from('progress')
      .update({
        mentor_feedback: mentorFeedback,
        status: newStatus,
        mentor_id: profile.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', progress.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update feedback",
        variant: "destructive",
      });
    } else {
      const statusText = newStatus === 'approved' ? 'approved' : 'revision requested';
      toast({
        title: "Success",
        description: `Milestone ${statusText}`,
      });
      
      // Send email notification for status change
      try {
        // Always notify the intern when mentor provides feedback
        const notificationData = {
          recipientEmail: profile?.email || 'intern@loomeroflow.com',
          recipientName: profile?.full_name || 'Intern',
          milestoneTitle: milestone.title,
          projectTitle: milestone.projects?.title || 'Project',
          status: newStatus, // This will be 'approved' or 'rejected'
          feedback: mentorFeedback
        };
        
        await supabase.functions.invoke('send-milestone-notification', {
          body: notificationData
        });
      } catch (emailError) {
        // Email notification failed - continue anyway
      }
      
      // If approved and this completes all milestones for the project, trigger certificate generation
      if (newStatus === 'approved') {
        toast({
          title: "Milestone Completed!",
          description: "The intern can now generate their certificate and LinkedIn post.",
        });
      }
      
      fetchMilestoneData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      case 'submitted': return 'bg-blue-500 text-white';
      case 'in_progress': return 'bg-yellow-500 text-black';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Needs Revision';
      case 'submitted': return 'Submitted';
      case 'in_progress': return 'In Progress';
      default: return 'Not Started';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center story-weave">
        <div className="text-foreground font-anta text-xl">Loading milestone...</div>
      </div>
    );
  }

  if (!milestone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center story-weave">
        <Card className="max-w-md loomero-warm-shadow">
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">Milestone Not Found</h3>
            <p className="text-muted-foreground mb-4">The milestone you're looking for doesn't exist.</p>
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
    <div className="min-h-screen bg-background p-6 story-weave">
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-3xl font-bold text-foreground font-anta">
              {milestone.title}
            </h1>
            <p className="text-muted-foreground">
              {milestone.projects?.title}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="bg-white border-loomero-accent/20 mb-6">
              <CardHeader>
                <CardTitle className="text-loomero-text font-anta">Milestone Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-loomero-text/80 mb-4">{milestone.description}</p>
                {milestone.due_date && (
                  <div className="flex items-center space-x-2 text-sm text-loomero-text/70">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {new Date(milestone.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {profile?.role === 'intern' && (
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader>
                  <CardTitle className="text-loomero-text font-anta">Your Submission</CardTitle>
                </CardHeader>
                <CardContent>
                  {!progress ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-loomero-text/40 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-loomero-text mb-2">Ready to Start?</h3>
                      <p className="text-loomero-text/70 mb-4">
                        Begin working on this milestone to track your progress.
                      </p>
                      <Button onClick={startProgress}>
                        Start Working
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="submission">Submission Notes</Label>
                        <Textarea
                          id="submission"
                          value={submissionNotes}
                          onChange={(e) => setSubmissionNotes(e.target.value)}
                          placeholder="Describe your work, challenges faced, and what you accomplished..."
                          rows={6}
                          disabled={progress.status === 'approved'}
                        />
                      </div>
                      {progress.status !== 'approved' && (
                        <Button onClick={updateSubmission} className="w-full">
                          {submissionNotes.trim() ? 'Submit for Review' : 'Save Progress'}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {progress?.mentor_feedback && (
              <Card className="bg-white border-loomero-accent/20 mt-6">
                <CardHeader>
                  <CardTitle className="text-loomero-text font-anta">Mentor Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-loomero-text/80">{progress.mentor_feedback}</p>
                  {progress.reviewed_at && (
                    <p className="text-sm text-loomero-text/60 mt-2">
                      Reviewed on {new Date(progress.reviewed_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {progress?.status === 'approved' && profile?.role === 'intern' && (
              <>
                <div className="mt-6">
                  <CertificateGenerator
                    internId={profile.id}
                    projectId={milestone.projects.id}
                    internName={profile.full_name || profile.email}
                    projectTitle={milestone.projects.title}
                    mentorName={progress.mentor_id ? 'Mentor' : undefined}
                    completionDate={progress.reviewed_at}
                  />
                </div>
                
                <div className="mt-6">
                  <LinkedInPostGenerator
                    internName={profile.full_name || profile.email}
                    projectTitle={milestone.projects.title}
                    badges={userBadges}
                    mentorName={progress.mentor_id ? 'Mentor' : undefined}
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-white border-loomero-accent/20">
              <CardHeader>
                <CardTitle className="text-loomero-text font-anta">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={`${getStatusColor(progress?.status || 'pending')} text-white`}>
                  {getStatusText(progress?.status || 'pending')}
                </Badge>
                {progress?.submitted_at && (
                  <p className="text-sm text-loomero-text/60 mt-2">
                    Submitted: {new Date(progress.submitted_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>

            {(profile?.role === 'mentor' || profile?.role === 'admin') && progress?.status === 'submitted' && (
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader>
                  <CardTitle className="text-loomero-text font-anta">Review Submission</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="feedback">Feedback</Label>
                      <Textarea
                        id="feedback"
                        value={mentorFeedback}
                        onChange={(e) => setMentorFeedback(e.target.value)}
                        placeholder="Provide constructive feedback..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Button 
                        onClick={() => updateMentorFeedback('approved')}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button 
                        onClick={() => updateMentorFeedback('rejected')}
                        variant="destructive"
                        className="w-full"
                      >
                        Request Revision
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {progress?.submission_notes && (
              <Card className="bg-white border-loomero-accent/20">
                <CardHeader>
                  <CardTitle className="text-loomero-text font-anta">Submission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-loomero-text/80 text-sm">{progress.submission_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneProgressPage;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface InternshipData {
  project_title: string;
  start_date: string;
  duration_weeks: number;
  completed_milestones: number;
  total_milestones: number;
}

interface CountdownProps {
  onComplete?: () => void;
}

const InternshipCountdown: React.FC<CountdownProps> = ({ onComplete }) => {
  const { profile } = useAuth();
  const [internshipData, setInternshipData] = useState<InternshipData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    isCompleted: false,
    canRequestCertificate: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'intern') {
      fetchInternshipData();
    }
  }, [profile]);

  useEffect(() => {
    if (internshipData) {
      const interval = setInterval(updateCountdown, 60000); // Update every minute
      updateCountdown(); // Initial update
      return () => clearInterval(interval);
    }
  }, [internshipData]);

  const fetchInternshipData = async () => {
    if (!profile) return;

    try {
      // Fetch the intern's current project and progress
      const { data: progressData } = await supabase
        .from('progress')
        .select(`
          milestone_id,
          milestones (
            id,
            project_id,
            projects (
              id,
              title,
              created_at,
              duration_weeks
            )
          ),
          status
        `)
        .eq('intern_id', profile.id)
        .order('created_at', { ascending: false });

      if (progressData && progressData.length > 0) {
        const milestone = progressData[0].milestones;
        const project = milestone?.projects;
        if (project && milestone) {
          // Get total milestones for this project
          const { data: allMilestones } = await supabase
            .from('milestones')
            .select('id')
            .eq('project_id', milestone.project_id);

          // Get completed milestones
          const { data: completedProgress } = await supabase
            .from('progress')
            .select('id')
            .eq('intern_id', profile.id)
            .eq('status', 'approved');

          setInternshipData({
            project_title: project.title,
            start_date: project.created_at,
            duration_weeks: project.duration_weeks,
            completed_milestones: completedProgress?.length || 0,
            total_milestones: allMilestones?.length || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching internship data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCountdown = () => {
    if (!internshipData) return;

    const startDate = new Date(internshipData.start_date);
    const endDate = new Date(startDate.getTime() + (internshipData.duration_weeks * 7 * 24 * 60 * 60 * 1000));
    const now = new Date();
    
    const timeDiff = endDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      // Internship period completed
      const allMilestonesCompleted = internshipData.completed_milestones >= internshipData.total_milestones;
      setTimeRemaining({
        days: 0,
        hours: 0,
        minutes: 0,
        isCompleted: true,
        canRequestCertificate: allMilestonesCompleted
      });
      if (onComplete && allMilestonesCompleted) {
        onComplete();
      }
    } else {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining({
        days,
        hours,
        minutes,
        isCompleted: false,
        canRequestCertificate: false
      });
    }
  };

  const getProgressPercentage = () => {
    if (!internshipData || internshipData.total_milestones === 0) return 0;
    return Math.round((internshipData.completed_milestones / internshipData.total_milestones) * 100);
  };

  const handleRequestCertificate = () => {
    window.location.href = '/projects';
  };

  if (loading) {
    return (
      <Card className="bg-white border-loomero-accent/20">
        <CardContent className="p-6">
          <div className="text-center text-loomero-text/70">Loading internship details...</div>
        </CardContent>
      </Card>
    );
  }

  if (!internshipData) {
    return (
      <Card className="bg-white border-loomero-accent/20">
        <CardHeader>
          <CardTitle className="text-loomero-text font-anta">Internship Status</CardTitle>
          <CardDescription>No active internship found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-loomero-text/40 mx-auto mb-2" />
            <p className="text-loomero-text/70">You haven't been assigned to a project yet.</p>
            <p className="text-sm text-loomero-text/60">Contact your mentor for project assignment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-loomero-hero to-loomero-accent text-white border-0 loomero-shadow">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 font-anta">
          {timeRemaining.isCompleted ? (
            <Trophy className="h-6 w-6" />
          ) : (
            <Clock className="h-6 w-6" />
          )}
          <span>
            {timeRemaining.isCompleted ? 'Internship Completed!' : 'Internship Countdown'}
          </span>
        </CardTitle>
        <CardDescription className="text-white/80">
          {internshipData.project_title}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!timeRemaining.isCompleted ? (
          <div className="text-center">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold font-anta">{timeRemaining.days}</div>
                <div className="text-sm text-white/80">Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold font-anta">{timeRemaining.hours}</div>
                <div className="text-sm text-white/80">Hours</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold font-anta">{timeRemaining.minutes}</div>
                <div className="text-sm text-white/80">Minutes</div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {timeRemaining.days === 0 ? 'Final day!' : `${timeRemaining.days} days remaining`}
            </Badge>
          </div>
        ) : (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4" />
            <div className="text-2xl font-bold font-anta mb-2">Congratulations!</div>
            <p className="text-white/90">You've completed your internship period.</p>
            {timeRemaining.canRequestCertificate && (
              <Button 
                onClick={handleRequestCertificate}
                className="mt-4 bg-white text-loomero-hero hover:bg-white/90"
              >
                Request Your Certificate
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/90">Progress</span>
            <span className="text-white font-semibold">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>{internshipData.completed_milestones} of {internshipData.total_milestones} milestones</span>
            <span>{internshipData.duration_weeks} weeks total</span>
          </div>
        </div>

        {getProgressPercentage() === 100 && !timeRemaining.isCompleted && (
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-sm text-white/90">
              🎉 All milestones completed! Certificate available after internship period ends.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InternshipCountdown;
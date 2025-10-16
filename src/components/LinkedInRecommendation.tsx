import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Send, FileText, CheckCircle, Clock, User } from 'lucide-react';

interface Recommendation {
  id: string;
  content: string;
  linkedin_template: string;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  mentor_profile: {
    full_name: string;
    email: string;
  };
  intern_profile: {
    full_name: string;
    email: string;
  };
}

interface LinkedInRecommendationProps {
  internId?: string;
  mentorId?: string;
  mode: 'mentor' | 'intern';
}

const LinkedInRecommendation: React.FC<LinkedInRecommendationProps> = ({ 
  internId, 
  mentorId, 
  mode 
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [newRecommendation, setNewRecommendation] = useState({
    content: '',
    linkedin_template: ''
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [profile, internId, mentorId]);

  const fetchRecommendations = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('recommendations')
        .select(`
          *,
          mentor_profile:profiles!recommendations_mentor_id_fkey(full_name, email),
          intern_profile:profiles!recommendations_intern_id_fkey(full_name, email)
        `);

      if (mode === 'mentor') {
        query = query.eq('mentor_id', profile.id);
        if (internId) query = query.eq('intern_id', internId);
      } else {
        query = query.eq('intern_id', profile.id);
        if (mentorId) query = query.eq('mentor_id', mentorId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateLinkedInTemplate = (content: string, internName: string, mentorName: string) => {
    const skills = ['problem-solving', 'teamwork', 'innovation', 'dedication', 'communication'];
    const selectedSkills = skills.slice(0, 3).join(', ');
    
    return `I'm delighted to recommend ${internName}, who recently completed their internship under my mentorship. 

${content}

${internName} consistently demonstrated ${selectedSkills}, and I have no doubt they will be a valuable asset to any organization. I highly recommend them for future opportunities.

#Internship #Mentorship #ProfessionalGrowth #Recommendation`;
  };

  const createRecommendation = async () => {
    if (!profile || !newRecommendation.content.trim() || !internId) return;

    setCreating(true);
    try {
      // Get intern details
      const { data: internData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', internId)
        .single();

      const linkedinTemplate = generateLinkedInTemplate(
        newRecommendation.content,
        internData?.full_name || 'This intern',
        profile.full_name || 'Mentor'
      );

      const { error } = await supabase
        .from('recommendations')
        .insert({
          mentor_id: profile.id,
          intern_id: internId,
          content: newRecommendation.content.trim(),
          linkedin_template: linkedinTemplate,
          is_draft: true
        });

      if (error) throw error;

      toast({
        title: "Recommendation Created",
        description: "Your recommendation has been saved as a draft.",
      });

      setNewRecommendation({ content: '', linkedin_template: '' });
      fetchRecommendations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create recommendation",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const updateRecommendationStatus = async (id: string, isDraft: boolean) => {
    try {
      const { error } = await supabase
        .from('recommendations')
        .update({ is_draft: isDraft })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isDraft ? "Saved as Draft" : "Recommendation Published",
        description: isDraft 
          ? "Your changes have been saved." 
          : "The recommendation is now available to the intern.",
      });

      fetchRecommendations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update recommendation",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareOnLinkedIn = (template: string) => {
    const encodedText = encodeURIComponent(template);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${window.location.origin}&text=${encodedText}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=600');
  };

  if (loading) {
    return (
      <Card className="bg-white border-loomero-accent/20">
        <CardContent className="p-6">
          <div className="text-center text-loomero-text/70">Loading recommendations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {mode === 'mentor' && internId && (
        <Card className="bg-white border-loomero-accent/20">
          <CardHeader>
            <CardTitle className="text-loomero-text font-anta flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Write LinkedIn Recommendation</span>
            </CardTitle>
            <CardDescription>
              Create a professional recommendation for your intern
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-loomero-text">
                Recommendation Content
              </label>
              <Textarea
                value={newRecommendation.content}
                onChange={(e) => setNewRecommendation(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write about the intern's skills, achievements, and work quality during the internship..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-loomero-text/60">
                A LinkedIn template will be automatically generated from your content.
              </p>
            </div>
            <Button 
              onClick={createRecommendation}
              disabled={creating || !newRecommendation.content.trim()}
              className="w-full"
            >
              {creating ? 'Creating...' : 'Create Recommendation'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-loomero-accent/20">
        <CardHeader>
          <CardTitle className="text-loomero-text font-anta flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>
              {mode === 'mentor' ? 'Your Recommendations' : 'Recommendations for You'}
            </span>
          </CardTitle>
          <CardDescription>
            {mode === 'mentor' 
              ? 'Recommendations you\'ve written for interns'
              : 'LinkedIn recommendations from your mentors'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-loomero-text/40 mx-auto mb-2" />
              <p className="text-loomero-text/70">No recommendations found</p>
              <p className="text-sm text-loomero-text/60">
                {mode === 'mentor' 
                  ? 'Create your first recommendation for an intern'
                  : 'Ask your mentor to write a LinkedIn recommendation for you'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {recommendations.map((rec) => (
                <div key={rec.id} className="border border-loomero-accent/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-loomero-hero rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-loomero-text">
                          {mode === 'mentor' 
                            ? `For: ${rec.intern_profile.full_name}`
                            : `From: ${rec.mentor_profile.full_name}`
                          }
                        </p>
                        <p className="text-sm text-loomero-text/70">
                          {new Date(rec.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={rec.is_draft ? "secondary" : "default"}
                      className="flex items-center space-x-1"
                    >
                      {rec.is_draft ? (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>Draft</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>Published</span>
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-loomero-text mb-2">Content:</h4>
                      <p className="text-sm text-loomero-text/80 bg-loomero-background/50 p-3 rounded-lg">
                        {rec.content}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-loomero-text mb-2">LinkedIn Template:</h4>
                      <p className="text-sm text-loomero-text/80 bg-loomero-background/50 p-3 rounded-lg whitespace-pre-line">
                        {rec.linkedin_template}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(rec.linkedin_template, 'LinkedIn template')}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Template
                      </Button>
                      
                      {!rec.is_draft && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => shareOnLinkedIn(rec.linkedin_template)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Share on LinkedIn
                        </Button>
                      )}

                      {mode === 'mentor' && (
                        <Button
                          size="sm"
                          variant={rec.is_draft ? "default" : "secondary"}
                          onClick={() => updateRecommendationStatus(rec.id, !rec.is_draft)}
                        >
                          {rec.is_draft ? 'Publish' : 'Make Draft'}
                        </Button>
                      )}
                    </div>
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

export default LinkedInRecommendation;
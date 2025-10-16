import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Linkedin, Share2, Award, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LinkedInPostGeneratorProps {
  internName: string;
  projectTitle: string;
  badges?: Array<{
    id: string;
    name: string;
    badge_type: string;
  }>;
  certificateId?: string;
  mentorName?: string;
}

export function LinkedInPostGenerator({
  internName,
  projectTitle,
  badges = [],
  certificateId,
  mentorName
}: LinkedInPostGeneratorProps) {
  const [generatedPost, setGeneratedPost] = useState('');
  const [customPost, setCustomPost] = useState('');
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generatePost = async () => {
    setGenerating(true);
    try {
      // Generate hashtags based on project and badges
      const projectHashtags = generateHashtags(projectTitle, badges);
      
      // Create achievement summary
      const achievementSummary = badges.length > 0 
        ? `\n\n🏆 Achievements unlocked:\n${badges.map(badge => `• ${badge.name}`).join('\n')}`
        : '';

      const mentorCredit = mentorName ? `\n\nSpecial thanks to ${mentorName} for the excellent mentorship! 🙏` : '';

      const certificateNote = certificateId ? `\n\n📜 Certificate ID: ${certificateId}` : '';

      const post = `🎉 Exciting milestone achieved! I've successfully completed my internship project "${projectTitle}" at LoomeroFlow! 

This journey has been incredibly rewarding, filled with learning opportunities, challenges that pushed my boundaries, and moments of breakthrough that made it all worthwhile.${achievementSummary}${mentorCredit}

💡 Key takeaways:
• Enhanced technical skills and problem-solving abilities
• Gained hands-on experience in real-world project development
• Developed stronger collaboration and communication skills
• Built lasting professional relationships${certificateNote}

Grateful for this opportunity and excited about applying these skills in future endeavors! 🚀

${projectHashtags}

#Internship #ProfessionalGrowth #LoomeroFlow #Learning #Achievement #Career #Development #Tech #Innovation #Grateful`;

      setGeneratedPost(post);
      setCustomPost(post);
      
      toast({
        title: "LinkedIn Post Generated!",
        description: "Your professional LinkedIn post is ready to share.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate LinkedIn post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateHashtags = (projectTitle: string, badges: Array<any>) => {
    const baseHashtags = ['#TechInternship', '#SoftwareDevelopment'];
    
    // Add project-specific hashtags
    const projectWords = projectTitle.toLowerCase().split(' ');
    const techHashtags: string[] = [];
    
    // Common tech keywords to hashtag mapping
    const techKeywords: Record<string, string> = {
      'web': '#WebDevelopment',
      'mobile': '#MobileDevelopment', 
      'app': '#AppDevelopment',
      'api': '#API',
      'database': '#Database',
      'ai': '#ArtificialIntelligence',
      'machine': '#MachineLearning',
      'data': '#DataScience',
      'react': '#React',
      'javascript': '#JavaScript',
      'python': '#Python',
      'node': '#NodeJS',
      'cloud': '#CloudComputing',
      'aws': '#AWS',
      'docker': '#Docker',
      'ui': '#UIDesign',
      'ux': '#UXDesign'
    };

    projectWords.forEach(word => {
      if (techKeywords[word]) {
        techHashtags.push(techKeywords[word]);
      }
    });

    // Add badge-specific hashtags
    const badgeHashtags = badges.map(badge => {
      const badgeName = badge.name.toLowerCase();
      if (badgeName.includes('leader')) return '#Leadership';
      if (badgeName.includes('innovation')) return '#Innovation';
      if (badgeName.includes('collaboration')) return '#Teamwork';
      if (badgeName.includes('problem')) return '#ProblemSolving';
      return `#${badge.name.replace(/\s+/g, '')}`;
    });

    return [...new Set([...baseHashtags, ...techHashtags, ...badgeHashtags])].join(' ');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard!",
        description: "LinkedIn post has been copied. You can now paste it on LinkedIn.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please select and copy manually.",
        variant: "destructive"
      });
    }
  };

  const shareOnLinkedIn = () => {
    const text = encodeURIComponent(customPost);
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}&text=${text}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Linkedin className="h-5 w-5" />
          LinkedIn Post Generator
        </CardTitle>
        <CardDescription>
          Create and customize a professional LinkedIn post to showcase your achievement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {badges.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Earned Badges
            </h4>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.id} variant="outline">
                  {badge.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={generatePost} 
          disabled={generating}
          className="w-full"
        >
          {generating ? "Generating..." : "Generate LinkedIn Post"}
        </Button>

        {generatedPost && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Generated Post (Customizable)</label>
              <Textarea
                value={customPost}
                onChange={(e) => setCustomPost(e.target.value)}
                rows={12}
                className="mt-2"
                placeholder="Your LinkedIn post will appear here..."
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => copyToClipboard(customPost)}
                variant="outline"
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Post
              </Button>
              <Button 
                onClick={shareOnLinkedIn}
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share on LinkedIn
              </Button>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
              <Hash className="h-3 w-3 inline mr-1" />
              <strong>Pro tip:</strong> Customize the post above to match your personal style. 
              Add specific technical details, personal insights, or modify the tone to reflect your voice.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';

interface BadgeCardProps {
  id: string;
  name: string;
  description: string;
  badge_type: 'milestone' | 'skill' | 'achievement' | 'completion';
  icon_url?: string;
  awarded_at?: string;
  awarded_by?: string;
}

const BadgeCard = ({ 
  name, 
  description, 
  badge_type, 
  icon_url, 
  awarded_at,
  awarded_by 
}: BadgeCardProps) => {
  const getBadgeTypeColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'bg-blue-500';
      case 'skill':
        return 'bg-green-500';
      case 'achievement':
        return 'bg-purple-500';
      case 'completion':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBadgeTypeLabel = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'Milestone';
      case 'skill':
        return 'Skill';
      case 'achievement':
        return 'Achievement';
      case 'completion':
        return 'Completion';
      default:
        return 'Badge';
    }
  };

  return (
    <Card className="bg-white border-loomero-accent/20 hover:shadow-md transition-shadow">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2">
          {icon_url ? (
            <img 
              src={icon_url} 
              alt={name} 
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className={`w-16 h-16 rounded-full ${getBadgeTypeColor(badge_type)} flex items-center justify-center`}>
              <Award className="h-8 w-8 text-white" />
            </div>
          )}
        </div>
        <CardTitle className="text-lg text-loomero-text font-anta">{name}</CardTitle>
        <Badge className={`${getBadgeTypeColor(badge_type)} text-white`}>
          {getBadgeTypeLabel(badge_type)}
        </Badge>
      </CardHeader>
      <CardContent className="text-center">
        <CardDescription className="text-loomero-text/70 mb-2">
          {description}
        </CardDescription>
        {awarded_at && (
          <p className="text-xs text-loomero-text/60">
            Earned on {new Date(awarded_at).toLocaleDateString()}
          </p>
        )}
        {awarded_by && (
          <p className="text-xs text-loomero-text/60">
            Awarded by {awarded_by}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BadgeCard;

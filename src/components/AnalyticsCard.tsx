
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const AnalyticsCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  iconColor = "text-blue-600",
  trend 
}: AnalyticsCardProps) => {
  return (
    <Card className="bg-white border-loomero-accent/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-loomero-text">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-loomero-text">{value}</div>
        {description && (
          <CardDescription className="text-xs text-loomero-text/70">
            {description}
          </CardDescription>
        )}
        {trend && (
          <div className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'} mt-1`}>
            {trend.isPositive ? '+' : ''}{trend.value}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsCard;

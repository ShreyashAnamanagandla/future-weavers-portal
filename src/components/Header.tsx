
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, FolderOpen, Award, BarChart3 } from 'lucide-react';

const Header = () => {
  const { user, profile, role, signOut } = useAuth();

  if (!user || !profile || !role) return null;

  const getRoleBadgeColor = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return 'bg-destructive hover:bg-destructive/90';
      case 'mentor':
        return 'bg-primary hover:bg-primary/90';
      case 'intern':
        return 'bg-secondary hover:bg-secondary/90';
      default:
        return 'bg-muted hover:bg-muted/90';
    }
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4 loomero-warm-shadow">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-anta text-foreground">LoomeroFlow</h1>
          <Badge className={`${getRoleBadgeColor(role)} text-white`}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Badge>
        </div>
        
        <nav className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/projects'}
            className="flex items-center space-x-2"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Projects</span>
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/badges'}
            className="flex items-center space-x-2"
          >
            <Award className="h-4 w-4" />
            <span>Badges</span>
          </Button>

          {(role === 'admin' || role === 'mentor') && (
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/analytics'}
              className="flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </Button>
          )}
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-foreground" />
              <span className="text-foreground">{profile.full_name || profile.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;

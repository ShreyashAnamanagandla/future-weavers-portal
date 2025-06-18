
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, FolderOpen, Award, BarChart3 } from 'lucide-react';

const Header = () => {
  const { user, profile, signOut } = useAuth();

  if (!user || !profile) return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 hover:bg-red-600';
      case 'mentor':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'intern':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <header className="bg-white border-b border-loomero-accent/20 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-anta text-loomero-text">LoomeroFlow</h1>
          <Badge className={`${getRoleBadgeColor(profile.role)} text-white`}>
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
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

          {(profile.role === 'admin' || profile.role === 'mentor') && (
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
              <User className="h-4 w-4 text-loomero-text" />
              <span className="text-loomero-text">{profile.full_name || profile.email}</span>
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

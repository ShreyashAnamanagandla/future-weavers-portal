
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Badge {
  id: string;
  name: string;
  description: string;
  badge_type: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface BadgeAwardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[];
  users: User[];
  onBadgeAwarded: () => void;
}

const BadgeAwardDialog = ({ isOpen, onClose, badges, users, onBadgeAwarded }: BadgeAwardDialogProps) => {
  const [selectedBadge, setSelectedBadge] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [isAwarding, setIsAwarding] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const handleAwardBadge = async () => {
    if (!selectedBadge || !selectedUser || !profile) return;

    setIsAwarding(true);

    try {
      // Check if user already has this badge
      const { data: existingBadge } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', selectedUser)
        .eq('badge_id', selectedBadge)
        .single();

      if (existingBadge) {
        toast({
          title: "Badge Already Awarded",
          description: "This user already has this badge.",
          variant: "destructive",
        });
        setIsAwarding(false);
        return;
      }

      // Award the badge
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: selectedUser,
          badge_id: selectedBadge,
          awarded_by: profile.id
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to award badge",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Badge awarded successfully!",
        });
        setSelectedBadge('');
        setSelectedUser('');
        onBadgeAwarded();
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }

    setIsAwarding(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Award Badge</DialogTitle>
          <DialogDescription>
            Select a badge and user to award recognition
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="badge-select">Select Badge</Label>
            <Select value={selectedBadge} onValueChange={setSelectedBadge}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a badge" />
              </SelectTrigger>
              <SelectContent>
                {badges.map((badge) => (
                  <SelectItem key={badge.id} value={badge.id}>
                    {badge.name} ({badge.badge_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-select">Select User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAwardBadge}
              disabled={!selectedBadge || !selectedUser || isAwarding}
            >
              {isAwarding ? 'Awarding...' : 'Award Badge'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeAwardDialog;


import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, RefreshCw } from 'lucide-react';

interface AccessCode {
  id: string;
  email: string;
  code: string;
  role: 'admin' | 'mentor' | 'intern';
  is_used: boolean;
  created_at: string;
  used_at: string | null;
}

const AccessCodeManager = () => {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState({
    email: '',
    role: 'intern' as 'admin' | 'mentor' | 'intern',
  });
  const [isCreating, setIsCreating] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAccessCodes();
    }
  }, [profile]);

  const fetchAccessCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Access codes fetch error:', error);
        throw error;
      }
      setAccessCodes(data || []);
    } catch (error: any) {
      console.error('Failed to fetch access codes:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch access codes. Please ensure you have admin permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const createAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.email.trim()) return;

    setIsCreating(true);
    const code = generateRandomCode();

    try {
      const { error } = await supabase
        .from('access_codes')
        .insert({
          email: newCode.email.trim(),
          code: code,
          role: newCode.role,
          created_by: profile?.id,
        });

      if (error) throw error;

      toast({
        title: "Access Code Created",
        description: `Code ${code} created for ${newCode.email}`,
      });

      setNewCode({ email: '', role: 'intern' });
      fetchAccessCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create access code",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetAccessCode = async (id: string, email: string) => {
    const newCode = generateRandomCode();
    
    try {
      const { error } = await supabase
        .from('access_codes')
        .update({
          code: newCode,
          is_used: false,
          used_at: null,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Access Code Reset",
        description: `New code ${newCode} generated for ${email}`,
      });

      fetchAccessCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reset access code",
        variant: "destructive",
      });
    }
  };

  const deleteAccessCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Access Code Deleted",
        description: "Access code has been removed",
      });

      fetchAccessCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete access code",
        variant: "destructive",
      });
    }
  };

  if (profile?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading access codes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Create Access Code</span>
          </CardTitle>
          <CardDescription>
            Generate a new access code for a user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createAccessCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newCode.email}
                onChange={(e) => setNewCode(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                required
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newCode.role}
                onValueChange={(value: 'admin' | 'mentor' | 'intern') => 
                  setNewCode(prev => ({ ...prev, role: value }))
                }
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Access Code'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Codes</CardTitle>
          <CardDescription>
            Manage existing access codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accessCodes.length === 0 ? (
              <p className="text-center text-gray-500">No access codes found</p>
            ) : (
              accessCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-mono text-lg font-bold">{code.code}</span>
                      <Badge variant={code.is_used ? 'secondary' : 'default'}>
                        {code.is_used ? 'Used' : 'Active'}
                      </Badge>
                      <Badge variant="outline">{code.role}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{code.email}</p>
                    <p className="text-xs text-gray-400">
                      Created: {new Date(code.created_at).toLocaleDateString()}
                      {code.used_at && ` • Used: ${new Date(code.used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetAccessCode(code.id, code.email)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteAccessCode(code.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessCodeManager;

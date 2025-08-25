
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Users, Mail, Calendar, RefreshCw } from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

type UserRole = 'admin' | 'mentor' | 'intern';

const PendingUsersManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});

  const { data: pendingUsers, isLoading, refetch } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      console.log('PendingUsersManager: Fetching pending users');
      const { data, error } = await supabase
        .from('pending_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('PendingUsersManager: Error fetching pending users:', error);
        throw error;
      }
      
      console.log('PendingUsersManager: Fetched pending users:', data);
      return data as PendingUser[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: UserRole }) => {
      console.log('PendingUsersManager: Approving user:', { email, role });
      const { data, error } = await supabase.rpc('approve_user', {
        _email: email,
        _role: role,
        _approver_id: user?.id
      });
      
      if (error) {
        console.error('PendingUsersManager: Error approving user:', error);
        throw error;
      }
      
      console.log('PendingUsersManager: User approved successfully:', data);
      return data[0];
    },
    onSuccess: async (data, variables) => {
      console.log('PendingUsersManager: Approval successful, sending email');
      toast({
        title: "User Approved",
        description: `${variables.email} has been approved with access code: ${data.access_code}`,
      });
      
      // Send approval email
      try {
        console.log('PendingUsersManager: Attempting to send approval email:', {
          email: variables.email,
          userName: data.user_name || variables.email,
          role: variables.role
        });
        
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-approval-email', {
          body: {
            email: variables.email,
            userName: data.user_name || variables.email,
            role: variables.role,
            accessCode: data.access_code
          }
        });
        
        console.log('PendingUsersManager: Email function response:', { emailData, emailError });
        
        if (emailError) {
          console.error('PendingUsersManager: Email sending failed with error:', {
            error: emailError,
            message: emailError.message,
            details: emailError.details || 'No additional details'
          });
          toast({
            title: "Email Failed",
            description: `User approved but email sending failed: ${emailError.message || 'Unknown error'}. Access code: ${data.access_code}`,
            variant: "destructive",
          });
        } else {
          console.log('PendingUsersManager: Approval email sent successfully');
          toast({
            title: "Email Sent",
            description: "Approval email sent successfully",
          });
        }
      } catch (emailError: any) {
        console.error('PendingUsersManager: Exception while sending email:', {
          error: emailError,
          message: emailError?.message || 'Unknown error',
          stack: emailError?.stack
        });
        toast({
          title: "Email Failed",
          description: `User approved but email sending failed: ${emailError?.message || 'Unknown error'}. Access code: ${data.access_code}`,
          variant: "destructive",
        });
      }
      
      // Refresh the pending users list
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
    },
    onError: (error) => {
      console.error('PendingUsersManager: Approval failed:', error);
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (email: string) => {
    const role = selectedRoles[email];
    console.log('PendingUsersManager: Handling approve for:', { email, role });
    
    if (!role) {
      toast({
        title: "Role Required",
        description: "Please select a role before approving the user",
        variant: "destructive",
      });
      return;
    }
    
    approveMutation.mutate({ email, role });
  };

  const handleRoleChange = (email: string, role: string) => {
    console.log('PendingUsersManager: Role changed for:', { email, role });
    setSelectedRoles(prev => ({
      ...prev,
      [email]: role as UserRole
    }));
  };

  const handleRefresh = () => {
    console.log('PendingUsersManager: Manually refreshing pending users');
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Pending Users</span>
          </CardTitle>
          <CardDescription>Loading pending users...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Pending Users</span>
            <Badge variant="secondary">{pendingUsers?.length || 0}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </CardTitle>
        <CardDescription>
          Approve new users and assign their roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!pendingUsers || pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending users found</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-4"
            >
              Refresh List
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">
                      {user.full_name || 'No name provided'}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={selectedRoles[user.email] || ''}
                      onValueChange={(value) => handleRoleChange(user.email, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="mentor">Mentor</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleApprove(user.email)}
                      disabled={approveMutation.isPending || !selectedRoles[user.email]}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Mail className="h-4 w-4" />
                      <span>
                        {approveMutation.isPending ? 'Approving...' : 'Approve & Send Email'}
                      </span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingUsersManager;

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PlusCircle, Edit, Trash2, UserCog, ShieldCheck, ShieldAlert, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
import { mockUsers as initialMockUsers } from '@/lib/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UsersPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>(initialMockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  // RBAC: Only Super Admins can access this page
  useEffect(() => {
    if (currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
      toast({ title: "Access Denied", description: "You do not have permission to manage users.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [currentUser, router, toast]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      toast({ title: "Error", description: "You cannot delete your own account.", variant: "destructive" });
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({ title: "User Deleted", description: `User with ID ${userId} has been removed.` });
  };
  
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground"><ShieldCheck className="mr-1 h-3 w-3" />Super Admin</Badge>;
      case UserRole.SUB_ADMIN:
        return <Badge variant="secondary" className="text-foreground"><ShieldAlert className="mr-1 h-3 w-3" />Sub Admin</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };


  if (currentUser?.role !== UserRole.SUPER_ADMIN) {
    return <div className="p-4"><p>Access Denied. Redirecting...</p></div>; // Should be redirected by useEffect
  }

  return (
    <TooltipProvider>
      <PageHeader title="User Management" description="Manage admin accounts and their roles.">
        <Link href="/admin/users/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New User
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                <SelectItem value={UserRole.SUB_ADMIN}>Sub Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] hidden sm:table-cell">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="text-center">Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="hidden sm:table-cell">
                        <Avatar>
                          <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="avatar" />
                          <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/admin/users/${user.id}/edit`} className="hover:underline text-primary">
                          {user.name}
                        </Link>
                        <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                      <TableCell className="text-center">{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/admin/users/${user.id}/edit`} passHref>
                                <Button variant="ghost" size="icon" aria-label="Edit user">
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Edit User / Change Role</TooltipContent>
                          </Tooltip>
                          {user.id !== currentUser?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                 <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" aria-label="Delete user">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete User</TooltipContent>
                                </Tooltip>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user "{user.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
             <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No users found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || roleFilter !== 'all' ? "Try adjusting your search or filter." : "Get started by adding a new user."}
              </p>
              {!(searchTerm || roleFilter !== 'all') && (
                <Button asChild className="mt-4">
                  <Link href="/admin/users/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add User
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

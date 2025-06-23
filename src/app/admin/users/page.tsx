
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, Edit, Trash2, UserCog, ShieldCheck, ShieldAlert, Search, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
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
import { getAdminUsers, deleteAdminUser } from '@/lib/actions/userActions';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const fetchAdminUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const fetchedAdminsData = await getAdminUsers();
    setAdminUsers(fetchedAdminsData);
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (!authLoading) {
      if (currentUser && currentUser.role === UserRole.SUPER_ADMIN) {
        fetchAdminUsers();
      } else if (currentUser) {
        toast({ title: "Access Denied", description: "You do not have permission to manage admin users.", variant: "destructive" });
        router.push('/admin/dashboard');
        setIsLoading(false);
      } else {
        setIsLoading(false);
        router.push('/');
      }
    }
  }, [currentUser, authLoading, router, toast, fetchAdminUsers]);


  const filteredAdminUsers = useMemo(() => { 
    return adminUsers.filter(user => {
      const nameMatch = user.name ? user.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      const emailMatch = user.email ? user.email.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      const matchesSearch = nameMatch || emailMatch;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [adminUsers, searchTerm, roleFilter]);

  const handleDeleteAdminUser = async (adminId: string, adminName: string) => { 
    if (adminId === currentUser?.id) {
      toast({ title: "Error", description: "You cannot delete your own account.", variant: "destructive" });
      return;
    }
    
    const result = await deleteAdminUser(adminId);
    
    if (result.success) {
      setAdminUsers(prev => prev.filter(u => u.id !== adminId));
      toast({ title: "Admin User Firestore Record Deleted", description: result.message || `Firestore record for admin user \"${adminName}\" has been removed.` });
    } else {
      toast({ title: "Error", description: result.error || "Failed to delete admin user.", variant: "destructive" });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground"><ShieldCheck className="mr-1 h-3 w-3" />Сүпер Админ</Badge>;
      case UserRole.SUB_ADMIN:
        return <Badge variant="secondary" className="text-foreground"><ShieldAlert className="mr-1 h-3 w-3" />Дэд Админ</Badge>;
      default:
        return <Badge variant="outline">{String(role)}</Badge>;
    }
  };

  if (isLoading || authLoading) {
     return (
      <>
        <PageHeader title="Хэрэглэгчийн менежмент" description="CMS дэх админ бүртгэл, эрхүүдийг удирдах">
           <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Шинэ хэрэглэгч нэмэх
          </Button>
        </PageHeader>
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <Skeleton className="h-10 w-full sm:max-w-xs" />
              <Skeleton className="h-10 w-full sm:w-[180px]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
        <div className="p-4">
            <p>Access Denied or Redirecting...</p>
        </div>
    );
  }


  return (
    <TooltipProvider>
      <PageHeader title="Хэрэглэгчийн менежмент" description="CMS дэх админ бүртгэл, эрхүүдийг удирдах">
        <Link href="/admin/users/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Админ нэмэх
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="нэр эсвэл имейлээр хайх..."
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
                <SelectItem value="all">Хандах Эрхүүд</SelectItem> 
                <SelectItem value={UserRole.SUPER_ADMIN}>Сүпер Админ</SelectItem>
                <SelectItem value={UserRole.SUB_ADMIN}>Дэд Админ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAdminUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] hidden sm:table-cell">Зураг</TableHead> 
                    <TableHead>Нэр</TableHead> 
                    <TableHead className="hidden md:table-cell">Имейл</TableHead> 
                    <TableHead className="text-center">Хандах эрх</TableHead> 
                    <TableHead className="text-right">Өөрчлөх</TableHead> 
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdminUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="hidden sm:table-cell">
                        <Avatar>
                          <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="avatar person" />
                          <AvatarFallback>{user.name ? user.name.substring(0, 2).toUpperCase() : 'N/A'}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/admin/users/${user.id}/edit`} className="hover:underline text-primary">
                          {user.name || 'N/A'}
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
                                <Button variant="ghost" size="icon" aria-label="Edit admin user"> 
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Админ эрх засах / хандах эрх өөрчлөх</TooltipContent> 
                          </Tooltip>
                          {user.id !== currentUser?.id && user.email !== 'super@example.com' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                 <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" aria-label="Delete admin user"> 
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Админ хэрэглэгч устгах (Firestore рекорд)</TooltipContent> 
                                </Tooltip>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle> 
                                  <AlertDialogDescription>
                                    This action will delete the admin user record for "{user.name}" from the database.
                                    Deleting the authentication record requires backend action.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel> 
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAdminUser(user.id, user.name)}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                  >
                                    Delete Firestore Record
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
              <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No admin users found</h3> 
              <p className="mt-1 text-sm text-muted-foreground">
                {adminUsers.length === 0 && !isLoading && !authLoading && !searchTerm && roleFilter === 'all' ? `No admin users exist in the '${'admins'}' collection.` :
                (searchTerm || roleFilter !== 'all' ? "Try adjusting your search or filter." : "Get started by adding a new admin user.")} 
              </p>
              {!(searchTerm || roleFilter !== 'all') && adminUsers.length === 0 && !isLoading && !authLoading && (
                <Button asChild className="mt-4">
                  <Link href="/admin/users/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Admin User
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


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
import { db, auth } from '@/lib/firebase'; 
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const ADMINS_COLLECTION = "admins"; // Changed from "users"

export default function UsersPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]); // Renamed users to adminUsers
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const addDebugMessage = useCallback((message: string) => {
    console.log("DEBUG (AdminUsersPage):", message);
    setDebugMessages(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
      addDebugMessage(`useEffect[currentUser access check]: Access Denied. Current admin: ${currentUser.email} (Role: ${currentUser.role}, ID: ${currentUser.id}). Redirecting to dashboard.`);
      toast({ title: "Access Denied", description: "You do not have permission to manage admin users.", variant: "destructive" });
      router.push('/admin/dashboard');
      setIsLoading(false);
    }
  }, [currentUser, authLoading, router, toast, addDebugMessage]);

  const fetchAdminUsers = useCallback(async () => { // Renamed fetchUsers to fetchAdminUsers
    const localCurrentUser = auth.currentUser; 
    const contextUserForLog = currentUser; 

    addDebugMessage(`fetchAdminUsers called. AuthContext currentUser: ${contextUserForLog ? `${contextUserForLog.email} (Role: ${contextUserForLog.role}, ID: ${contextUserForLog.id})` : 'null'}. Actual Firebase Auth UID for op: ${localCurrentUser ? localCurrentUser.uid : 'null (Firebase Auth)'}`);

    if (!localCurrentUser || (contextUserForLog && contextUserForLog.role !== UserRole.SUPER_ADMIN)) {
      addDebugMessage(`fetchAdminUsers: Pre-condition failed. Firebase Auth UID: ${localCurrentUser?.uid}. AuthContext Role: ${contextUserForLog?.role}. Aborting fetch.`);
      setIsLoading(false);
      if (!localCurrentUser) {
          toast({title: "Authentication Error", description: "No authenticated admin found for fetching admin list. Please re-login.", variant: "destructive", duration: 10000});
          router.push('/');
      }
      return;
    }

    setIsLoading(true);
    setAdminUsers([]);
    addDebugMessage(`fetchAdminUsers: Attempting to fetch admin users from Firestore collection '${ADMINS_COLLECTION}' as Super Admin (UID: ${localCurrentUser.uid})...`);
    try {
      const adminsCollectionRef = collection(db, ADMINS_COLLECTION); // Use ADMINS_COLLECTION
      const q = query(adminsCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedAdminsData: UserProfile[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedAdminsData.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      setAdminUsers(fetchedAdminsData);
      addDebugMessage(`fetchAdminUsers: Success. Fetched ${fetchedAdminsData.length} admin users.`);
      if (fetchedAdminsData.length === 0) {
        addDebugMessage(`fetchAdminUsers: No admin users returned from Firestore query. Check collection content and Firestore Rules for 'list' on '/${ADMINS_COLLECTION}' collection, ensuring it allows access for the Super Admin.`);
      }
    } catch (error: any) {
      console.error("Error fetching admin users from Firestore:", error);
      addDebugMessage(`fetchAdminUsers: Firestore Error - UID performing op: ${localCurrentUser.uid}, Code: ${error.code}, Message: ${error.message}`);
      let errorTitle = "Error fetching admin users";
      let errorMessage = `Failed to retrieve admin user data: ${error.message}.`;
      if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission-denied'))) {
        errorTitle = "Firestore Permission Denied";
        errorMessage = `Failed to list admin users from '${ADMINS_COLLECTION}'. UID: ${localCurrentUser.uid}. Ensure Firestore Rules grant 'list' on '/${ADMINS_COLLECTION}' FOR an admin whose document at '/${ADMINS_COLLECTION}/${localCurrentUser.uid}' has 'role: "Super Admin"'.`;
      }
      toast({ title: errorTitle, description: errorMessage, variant: "destructive", duration: 30000 });
    } finally {
      setIsLoading(false);
      addDebugMessage("fetchAdminUsers: Fetch attempt finished.");
    }
  }, [currentUser, toast, addDebugMessage, router]);

  useEffect(() => {
    if (!authLoading && currentUser) {
        if (currentUser.role === UserRole.SUPER_ADMIN) {
            addDebugMessage(`useEffect[currentUser, fetchAdminUsers]: AuthContext currentUser is Super Admin (ID: ${currentUser.id}). Calling fetchAdminUsers.`);
            fetchAdminUsers();
        } else {
            addDebugMessage(`useEffect[currentUser, fetchAdminUsers]: AuthContext currentUser (ID: ${currentUser.id}) is NOT Super Admin (role: ${currentUser.role}). Not fetching admin users. isLoading set to false.`);
            setIsLoading(false);
        }
    } else if (!authLoading && !currentUser) {
        addDebugMessage("useEffect[currentUser, fetchAdminUsers]: AuthContext currentUser is null and auth is not loading. Redirecting to / might be handled by AdminLayout.");
        setIsLoading(false);
    } else {
        addDebugMessage("useEffect[currentUser, fetchAdminUsers]: authLoading is true. Waiting for auth state...");
        setIsLoading(true);
    }
  }, [currentUser, authLoading, fetchAdminUsers, addDebugMessage]);


  const filteredAdminUsers = useMemo(() => { // Renamed filteredUsers
    return adminUsers.filter(user => {
      const nameMatch = user.name ? user.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      const emailMatch = user.email ? user.email.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      const matchesSearch = nameMatch || emailMatch;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [adminUsers, searchTerm, roleFilter]);

  const handleDeleteAdminUser = async (adminId: string, adminName: string) => { // Renamed handleDeleteUser
    if (adminId === currentUser?.id) {
      toast({ title: "Error", description: "You cannot delete your own account.", variant: "destructive" });
      return;
    }
    addDebugMessage(`Attempting to delete admin user: ${adminId} (${adminName}) by admin: ${currentUser?.id}`);
    try {
      await deleteDoc(doc(db, ADMINS_COLLECTION, adminId)); // Use ADMINS_COLLECTION
      setAdminUsers(prev => prev.filter(u => u.id !== adminId));
      toast({ title: "Admin User Firestore Record Deleted", description: `Firestore record for admin user \"${adminName}\" has been removed.` });
      toast({
        title: "Important: Auth User Deletion",
        description: `Admin record for ${adminName} removed from Firestore. For full deletion, the Firebase Authentication record (UID: ${adminId}) needs to be removed by an administrator via backend tools or a Cloud Function.`,
        variant: "default",
        duration: 10000,
      });

    } catch (error: any) {
      console.error("Error deleting admin user from Firestore:", error);
      addDebugMessage(`Error deleting admin user ${adminId} from Firestore: ${error.code} - ${error.message}`);
      toast({ title: "Error", description: `Failed to delete admin user ${adminName} from Firestore. Check permissions.`, variant: "destructive" });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground"><ShieldCheck className="mr-1 h-3 w-3" />Super Admin</Badge>;
      case UserRole.SUB_ADMIN:
        return <Badge variant="secondary" className="text-foreground"><ShieldAlert className="mr-1 h-3 w-3" />Sub Admin</Badge>;
      default:
        return <Badge variant="outline">{String(role)}</Badge>;
    }
  };

  if (isLoading || authLoading) {
     return (
      <>
        <PageHeader title="User Management" description="Manage admin accounts and their roles.">
           <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New User
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
            <div className="mt-4 p-2 border rounded bg-muted/50">
                <p className="text-xs font-semibold">Debug Log (Loading State):</p>
                <pre className="text-xs max-h-40 overflow-auto whitespace-pre-wrap break-all">{debugMessages.join("\n")}</pre>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (!authLoading && currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
        <div className="p-4">
            <p>Access Denied. You do not have permission to view this page.</p>
            <Card className="mt-4">
                <CardHeader><CardTitle className="text-sm font-headline">Debug Information (Access Denied State)</CardTitle></CardHeader>
                <CardContent><pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-all">{debugMessages.join("\n")}</pre></CardContent>
            </Card>
        </div>
    );
  }

  if (!authLoading && !currentUser) {
      return (
        <div className="p-4">
            <p>Admin user not authenticated. Redirecting to login might be in progress...</p>
             <Card className="mt-4">
                <CardHeader><CardTitle className="text-sm font-headline">Debug Information (No Current User State)</CardTitle></CardHeader>
                <CardContent><pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-all">{debugMessages.join("\n")}</pre></CardContent>
            </Card>
        </div>
      );
  }


  return (
    <TooltipProvider>
      <PageHeader title="User Management" description="Manage admin accounts and their roles in the CMS.">
        <Link href="/admin/users/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Admin User
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search admins by name or email..."
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
          {filteredAdminUsers.length > 0 ? (
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
                            <TooltipContent>Edit Admin User / Change Role</TooltipContent>
                          </Tooltip>
                          {user.id !== currentUser?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                 <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" aria-label="Delete admin user">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete Admin User (Firestore Record)</TooltipContent>
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
                {adminUsers.length === 0 && !isLoading && !authLoading && !searchTerm && roleFilter === 'all' ? `No admin users exist in the '${ADMINS_COLLECTION}' collection, or access was denied. Ensure Firestore rules grant 'list' access to your Super Admin user AND your Super Admin user's document in Firestore has 'role: "Super Admin"'.` :
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
        <Card className="mt-4">
            <CardHeader><CardTitle className="text-sm font-headline">Debug Information (Admin Users Page)</CardTitle></CardHeader>
            <CardContent>
                <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-all">{debugMessages.join("\n")}</pre>
            </CardContent>
        </Card>
    </TooltipProvider>
  );
}

    

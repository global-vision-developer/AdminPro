
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, NotificationLog, UserProfile } from '@/types';
import { getAppUsers } from '@/lib/actions/appUserActions';
import { NotificationForm, type NotificationFormValues } from './components/notification-form';
import { getNotificationLogs } from '@/lib/actions/notificationActions'; 
import { NotificationHistory } from './components/notification-history';
import { MailWarning, Send, Users, Loader2, Search as SearchIcon, Info, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { app as clientApp } from '@/lib/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function NotificationsPage() {
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, AppUser>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSendNotificationDialogOpen, setIsSendNotificationDialogOpen] = useState(false);
  const [isSubmittingNotification, setIsSubmittingNotification] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [users, logs] = await Promise.all([
        getAppUsers(),
        getNotificationLogs()
      ]);
      setAppUsers(users);
      setNotificationLogs(logs);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Алдаа", description: "Хэрэглэгчид эсвэл мэдэгдлийн түүхийг ачааллахад алдаа гарлаа.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAppUsers = useMemo(() => {
    if (!searchTerm) return appUsers;
    return appUsers.filter(user =>
      (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [appUsers, searchTerm]);

  const handleSelectUser = (user: AppUser, checked: boolean) => {
    setSelectedUsers(prev => {
      const newSelected = { ...prev };
      if (checked) {
        newSelected[user.id] = user;
      } else {
        delete newSelected[user.id];
      }
      return newSelected;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allSelected = filteredAppUsers.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, AppUser>);
      setSelectedUsers(allSelected);
    } else {
      setSelectedUsers({});
    }
  };

  const selectedUserCount = Object.keys(selectedUsers).length;
  const isAllFilteredSelected = filteredAppUsers.length > 0 && selectedUserCount === filteredAppUsers.length;

  const handleOpenSendDialog = () => {
    if (selectedUserCount === 0) {
      toast({ title: "Хэрэглэгч сонгоогүй", description: "Мэдэгдэл илгээхийн тулд дор хаяж нэг хэрэглэгч сонгоно уу.", variant: "destructive" });
      return;
    }
    setIsSendNotificationDialogOpen(true);
  };

  const handleSendNotificationSubmit = async (formData: NotificationFormValues) => {
    setIsSubmittingNotification(true);

    if (!currentUser) {
        toast({ title: "Алдаа", description: "Admin not authenticated. Please log in again.", variant: "destructive" });
        setIsSubmittingNotification(false);
        return;
    }

    const selectedUserIds = Object.keys(selectedUsers);
    if (selectedUserIds.length === 0) {
        toast({ title: "Алдаа", description: "Мэдэгдэл илгээхийн тулд хэрэглэгч сонгоно уу.", variant: "destructive" });
        setIsSubmittingNotification(false);
        return;
    }

    const payload = {
        ...formData,
        scheduleAt: formData.scheduleAt ? formData.scheduleAt.toISOString() : null,
        selectedUserIds: selectedUserIds,
        adminCreator: {
            uid: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
        },
    };

    try {
        const functions = getFunctions(clientApp, 'us-central1');
        const callSendNotification = httpsCallable(functions, 'sendNotification');
        
        const result = await callSendNotification(payload) as HttpsCallableResult<{success: boolean; message: string; error?: string}>;

        if (result.data.success) {
            toast({ title: "Хүсэлт амжилттай", description: result.data.message });
            setIsSendNotificationDialogOpen(false);
            setSelectedUsers({});
            fetchData(); // Refreshes history
        } else {
            toast({ title: "Алдаа", description: result.data.error || "Cloud функцээс тодорхойгүй алдаа гарлаа.", variant: "destructive" });
        }
    } catch (error: any) {
        console.error("Error calling 'sendNotification' Cloud Function:", error);
        let errorMessage = error.message || "Мэдэгдэл илгээхэд алдаа гарлаа.";
        if (error.code === 'functions/unauthenticated') {
            errorMessage = "Authentication error. Please log out and log back in.";
        } else if (error.code === 'functions/unavailable' || error.code === 'functions/not-found') {
            errorMessage = "The notification service is currently unavailable. Please try again later.";
        }
        toast({ title: "Алдаа", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSubmittingNotification(false);
    }
  };

  return (
    <>
      <PageHeader title="Мэдэгдэл Илгээх" description="Аппын хэрэглэгчид рүү push notification илгээнэ үү.">
        <div className='flex items-center gap-2'>
            <Button onClick={handleOpenSendDialog} disabled={selectedUserCount === 0 || isLoading}>
                <Send className="mr-2 h-4 w-4" /> Мэдэгдэл илгээх ({selectedUserCount})
            </Button>
            <Button onClick={fetchData} variant="outline" size="icon" disabled={isLoading} aria-label="Refresh Data">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Апп Хэрэглэгчид</CardTitle>
          <CardDescription>Мэдэгдэл илгээх хэрэглэгчдийг сонгоно уу. Хэрэглэгчид апп дотроосоо FCM token-оо бүртгүүлсэн байх шаардлагатай.</CardDescription>
          <div className="relative mt-2">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Хэрэглэгчийн нэр эсвэл имэйлээр хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Хэрэглэгчдийг ачаалж байна...</p>
            </div>
          ) : filteredAppUsers.length === 0 ? (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-lg font-medium">Хэрэглэгч олдсонгүй</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Хайлтын үр дүнд тохирох хэрэглэгч олдсонгүй." : "Системд бүртгэлтэй апп хэрэглэгч алга, эсвэл `users` collection хоосон байна."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-520px)]">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={isAllFilteredSelected}
                          onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                          aria-label="Бүх хэрэглэгчийг сонгох"
                        />
                      </TableHead>
                      <TableHead>Нэр</TableHead>
                      <TableHead>Имэйл</TableHead>
                      <TableHead className="text-center">FCM Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppUsers.map((user) => (
                      <TableRow key={user.id} data-state={selectedUsers[user.id] ? "selected" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={!!selectedUsers[user.id]}
                            onCheckedChange={(checked) => handleSelectUser(user, Boolean(checked))}
                            aria-label={`${user.displayName || user.email} хэрэглэгчийг сонгох`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{user.displayName || <span className="italic text-muted-foreground">Нэргүй</span>}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-center">
                          {user.fcmTokens && user.fcmTokens.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="font-mono text-xs text-muted-foreground" title={user.fcmTokens[0]}>
                                  {`${user.fcmTokens[0].substring(0, 20)}...`}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm break-all">
                                <p className="text-xs font-mono">{user.fcmTokens[0]}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge variant="outline" className="border-amber-400 text-amber-600">
                              <MailWarning className="mr-1 h-3 w-3" /> 0
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      <div className='mt-8'>
        <NotificationHistory logs={notificationLogs} isLoading={isLoading} />
      </div>

      <Dialog open={isSendNotificationDialogOpen} onOpenChange={setIsSendNotificationDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Мэдэгдэл Илгээх</DialogTitle>
            <DialogDescription>
              Сонгосон {selectedUserCount} хэрэглэгч(ид) рүү мэдэгдэл илгээнэ. Зөвхөн идэвхтэй FCM token-той хэрэглэгчид рүү илгээгдэнэ.
            </DialogDescription>
          </DialogHeader>
          <NotificationForm
            onSubmit={handleSendNotificationSubmit}
            isSubmitting={isSubmittingNotification}
            onCancel={() => setIsSendNotificationDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}


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
import type { AppUser, NotificationLog } from '@/types';
import { getAppUsers } from '@/lib/actions/appUserActions';
import { NotificationForm, type NotificationFormValues } from './components/notification-form';
import { createNotificationEntry, getNotificationLogs } from '@/lib/actions/notificationActions'; 
import { NotificationHistory } from './components/notification-history'; // Import new component
import { MailWarning, Send, Users, Loader2, Search as SearchIcon, Info, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

export default function NotificationsPage() {
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]); // State for history
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
    const usersWithTokens = Object.values(selectedUsers).filter(u => u.fcmTokens && u.fcmTokens.length > 0);
    if (usersWithTokens.length === 0) {
        toast({ title: "FCM Token байхгүй", description: "Сонгосон хэрэглэгчдийн хэн нь ч бүртгэгдсэн FCM token-гүй байна. Мэдэгдэл илгээх боломжгүй.", variant: "destructive", duration: 7000 });
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

    const usersToSend = Object.values(selectedUsers).filter(u => u.fcmTokens && u.fcmTokens.length > 0);

    if (usersToSend.length === 0) {
        toast({ title: "Алдаа", description: "Идэвхтэй FCM token-той хэрэглэгч олдсонгүй.", variant: "destructive" });
        setIsSubmittingNotification(false);
        setIsSendNotificationDialogOpen(false);
        return;
    }
    
    const result = await createNotificationEntry({ ...formData, selectedUsers: usersToSend, adminCreator: currentUser });
    setIsSubmittingNotification(false);

    if (result && "id" in result) {
      toast({ title: "Мэдэгдэл хүсэлт үүслээ", description: `Мэдэгдэл илгээх хүсэлт амжилттай үүсч, Firestore-д хадгалагдлаа (ID: ${result.id}). Firebase Function боловсруулахыг хүлээнэ үү.` });
      setIsSendNotificationDialogOpen(false);
      setSelectedUsers({});
      fetchData(); // Refresh data including logs
    } else if (result && "error" in result) {
      toast({ title: "Алдаа", description: result.error, variant: "destructive" });
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

      <Alert variant="default" className="mb-4 border-blue-500">
        <Info className="h-5 w-5 text-blue-500" />
        <AlertTitle className="font-semibold text-blue-700">FCM Tokens-ийн тухай</AlertTitle>
        <AlertDescription className="text-blue-600">
          Энэ хэсэг нь Firebase Cloud Messaging (FCM) ашиглан notification илгээнэ. Таны хэрэглэгчийн аппликэйшн (React Native, Flutter, Swift, г.м) нь FCM-ээс авсан төхөөрөмжийн token-оо Firestore-ийн `users` collection доторх тухайн хэрэглэгчийн document-ийн `fcmTokens` (массивын төрөлтэй) талбарт хадгалах ёстой.
        </AlertDescription>
      </Alert>

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
                           <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                            {user.fcmTokens.length}
                          </Badge>
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

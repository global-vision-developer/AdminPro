
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { AppUser } from '@/types';
import { getAppUsers } from '@/lib/actions/appUserActions';
import { NotificationForm, type NotificationFormValues } from './components/notification-form';
import { createNotificationEntry } from '@/lib/actions/notificationActions'; 
import { MailWarning, Send, Users, Loader2, Search as SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function NotificationsPage() {
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, AppUser>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSendNotificationDialogOpen, setIsSendNotificationDialogOpen] = useState(false);
  const [isSubmittingNotification, setIsSubmittingNotification] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUsers() {
      setIsLoadingUsers(true);
      const users = await getAppUsers();
      setAppUsers(users);
      setIsLoadingUsers(false);
    }
    fetchUsers();
  }, []);

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
    // Check if any selected user has FCM tokens
    const usersWithTokens = Object.values(selectedUsers).filter(u => u.fcmTokens && u.fcmTokens.length > 0);
    if (usersWithTokens.length === 0) {
        toast({ title: "FCM Token байхгүй", description: "Сонгосон хэрэглэгчдийн хэн нь ч бүртгэгдсэн FCM token-гүй байна. Мэдэгдэл илгээх боломжгүй.", variant: "destructive", duration: 7000 });
        return;
    }
    setIsSendNotificationDialogOpen(true);
  };

  const handleSendNotificationSubmit = async (formData: NotificationFormValues) => {
    setIsSubmittingNotification(true);
    const usersToSend = Object.values(selectedUsers).filter(u => u.fcmTokens && u.fcmTokens.length > 0);

    if (usersToSend.length === 0) {
        toast({ title: "Алдаа", description: "Идэвхтэй FCM token-той хэрэглэгч олдсонгүй.", variant: "destructive" });
        setIsSubmittingNotification(false);
        setIsSendNotificationDialogOpen(false);
        return;
    }
    
    const result = await createNotificationEntry({ ...formData, selectedUsers: usersToSend });
    setIsSubmittingNotification(false);

    if (result && "id" in result) {
      toast({ title: "Мэдэгдэл хүсэлт үүслээ", description: `Мэдэгдэл илгээх хүсэлт амжилттай үүсч, Firestore-д хадгалагдлаа (ID: ${result.id}). Firebase Function боловсруулахыг хүлээнэ үү.` });
      setIsSendNotificationDialogOpen(false);
      setSelectedUsers({}); // Clear selection
    } else if (result && "error" in result) {
      toast({ title: "Алдаа", description: result.error, variant: "destructive" });
    }
  };

  return (
    <>
      <PageHeader title="Мэдэгдэл Илгээх" description="Аппын хэрэглэгчид рүү push notification илгээнэ үү.">
        <Button onClick={handleOpenSendDialog} disabled={selectedUserCount === 0 || isLoadingUsers}>
          <Send className="mr-2 h-4 w-4" /> Мэдэгдэл илгээх ({selectedUserCount})
        </Button>
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
          {isLoadingUsers ? (
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
            <ScrollArea className="h-[calc(100vh-350px)]">
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
       <Card className="mt-6">
        <CardHeader>
            <CardTitle className="text-base font-semibold">Firebase Function Шаардлагатай</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Энэ UI нь мэдэгдэл илгээх хүсэлтийг Firestore-ийн <code className="font-mono bg-muted px-1 rounded">notifications</code> collection-д хадгална. 
                Мэдэгдлийг бодитоор хэрэглэгчид рүү FCM ашиглан илгээхийн тулд та Firebase Function (Cloud Function) үүсгэх шаардлагатай.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
                Firebase Function нь <code className="font-mono bg-muted px-1 rounded">notifications</code> collection-д шинэ document үүсэхэд (onCreate trigger) ажиллаж,
                тухайн document-д заасан <code className="font-mono bg-muted px-1 rounded">targets</code> дахь FCM token-ууд руу мэдэгдэл илгээж, илгээлтийн статусыг буцааж шинэчлэх ёстой.
                Мөн <code className="font-mono bg-muted px-1 rounded">scheduleAt</code> талбарыг шалгаж, хуваарьт мэдэгдлийг дэмжих боломжтой.
            </p>
        </CardContent>
      </Card>
    </>
  );
}


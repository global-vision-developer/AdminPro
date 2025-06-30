/**
 * @fileoverview This is the root layout for the authenticated admin section of the application.
 * It enforces authentication, provides a consistent sidebar and header structure for all admin pages,
 * and handles the loading state while checking user authentication.
 * Энэ файл нь админ хэсгийн үндсэн layout-г тодорхойлно. Энэ нь нэвтэрсэн хэрэглэгчдэд зориулсан
 * sidebar, header зэргийг агуулж, нэвтрээгүй хэрэглэгчийг нэвтрэх хуудас руу автоматаар чиглүүлдэг.
 */
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader as ShadSidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SidebarNav } from '@/components/admin/sidebar-nav';
import { AdminHeader } from '@/components/admin/admin-header';
import { Logo } from '@/components/admin/logo';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, logout } = useAuth();
  const router = useRouter();

  // Нэвтрэлтийн төлөвийг шалгах
  // Хэрэв loading дууссан боловч currentUser байхгүй бол нэвтрэх хуудас руу үсэргэх
  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, loading, router]);

  // Хэрэглэгчийн мэдээллийг ачаалж байх үед харуулах Skeleton UI
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  // Хэрэглэгч нэвтрээгүй бол юу ч харуулахгүй (учир нь router.push хийгдэж байгаа)
  if (!currentUser) {
    return null; 
  }

  // Нэвтэрсэн хэрэглэгчид зориулсан үндсэн layout
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <ShadSidebarHeader className="p-2 border-b">
          <Logo />
        </ShadSidebarHeader>
        <SidebarContent className="p-0">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-2 border-t">
           <Button variant="ghost" onClick={logout} className="w-full justify-start gap-2 text-sm">
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Гарах</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t py-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Админ Про. Бүх эрх хуулиар хамгаалагдсан.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}

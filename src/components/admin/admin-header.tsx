"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/admin/user-nav";
import { Logo } from "./logo";
import { useSidebar } from "@/components/ui/sidebar";


export function AdminHeader() {
  const { isMobile, state } = useSidebar();
  const showLogo = isMobile || state === 'collapsed';

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-6 lg:px-8">
        <div className="flex items-center">
          <SidebarTrigger className="mr-2 md:mr-4" />
          {showLogo && <Logo collapsed={true} />}
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}

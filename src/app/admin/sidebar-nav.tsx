
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Library,
  Newspaper,
  Settings,
  ChevronDown,
  ChevronRight,
  Bell // Bell icon нэмэгдсэн
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/types";
import React, { useState } from "react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
  subItems?: NavItem[];
  hideIfSubAdmin?: boolean;
}

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Хяналтын самбар", icon: LayoutDashboard },
  {
    href: "/admin/content", label: "Контент", icon: Library,
    subItems: [
      { href: "/admin/categories", label: "категори", icon: Library, roles: [UserRole.SUPER_ADMIN] },
      { href: "/admin/entries", label: "бүртгэл", icon: Newspaper, roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN] },
    ]
  },
  { href: "/admin/notifications", label: "Мэдэгдэл", icon: Bell, roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN] }, // Мэдэгдэл цэс нэмэгдсэн
  { href: "/admin/users", label: "Хэрэглэгчид", icon: Users, roles: [UserRole.SUPER_ADMIN] },
  // { href: "/admin/settings", label: "Settings", icon: Settings },
];


export function SidebarNav() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { state: sidebarState } = useSidebar();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  if (!currentUser) return null;

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    if (item.roles && !item.roles.includes(currentUser.role)) {
      return null;
    }
    if (item.hideIfSubAdmin && currentUser.role === UserRole.SUB_ADMIN) {
        return null;
    }
    if (item.label === "категори" && currentUser.role === UserRole.SUB_ADMIN) {
        return null;
    }

    let itemIsActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
    if (item.subItems && !itemIsActive) {
        itemIsActive = item.subItems.some(sub => {
            if (sub.label === "категори" && currentUser.role === UserRole.SUB_ADMIN) return false;
            return pathname.startsWith(sub.href);
        });
    }

    const Icon = item.icon;
    const isMenuOpen = openMenus[item.label] || (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href)));

    if (item.subItems) {
      const visibleSubItems = item.subItems.filter(subItem => {
        if (subItem.roles && !subItem.roles.includes(currentUser.role)) return false;
        if (subItem.hideIfSubAdmin && currentUser.role === UserRole.SUB_ADMIN) return false;
        if (subItem.label === "категори" && currentUser.role === UserRole.SUB_ADMIN) return false;
        return true;
      });

      if (visibleSubItems.length === 0) return null;

      if (sidebarState === 'collapsed') {
        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild={false}
              isActive={itemIsActive}
              tooltip={item.label}
              className="justify-start"
            >
              <Icon />
              <span className="truncate">{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      }
      return (
        <Accordion type="single" collapsible className="w-full" key={item.label} defaultValue={isMenuOpen || itemIsActive ? item.label : undefined}>
          <AccordionItem value={item.label} className="border-none">
            <AccordionTrigger
              onClick={() => toggleMenu(item.label)}
              className={cn(
                "flex items-center justify-between w-full p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm font-medium",
                itemIsActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                "justify-start",
                " [&[data-state=open]>svg:last-child]:rotate-180"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </div>
              {/* The AccordionTrigger from shadcn/ui automatically adds its own ChevronDown icon */}
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-0 pl-4">
              <SidebarMenuSub className="mx-0 border-l-0 px-0 py-1">
                {visibleSubItems.map(subItem => (
                  <SidebarMenuSubItem key={subItem.label}>
                     {renderNavItem(subItem, true)}
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    } else {
      if (isSubItem) {
        return (
          <SidebarMenuSubButton
            asChild
            isActive={itemIsActive}
          >
            <Link href={item.href} className="flex items-center gap-2">
              <Icon />
              <span className="truncate">{item.label}</span>
            </Link>
          </SidebarMenuSubButton>
        );
      } else {
        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild
              isActive={itemIsActive}
              tooltip={sidebarState === 'collapsed' ? item.label : undefined}
              className="justify-start"
            >
              <Link href={item.href} className="flex items-center gap-2">
                <Icon />
                <span className={cn("truncate", sidebarState === 'collapsed' ? 'hidden' : 'inline')}>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      }
    }
  };


  return (
    <nav className="flex flex-col h-full">
      <SidebarMenu className="flex-grow">
        {navItems.map(item => renderNavItem(item))}
      </SidebarMenu>
    </nav>
  );
}


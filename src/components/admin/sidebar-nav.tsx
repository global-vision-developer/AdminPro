
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
  ChevronRight
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
}

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/admin/content", label: "Content", icon: Library, // Parent item href
    subItems: [
      { href: "/admin/categories", label: "Categories", icon: Library, roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN] },
      { href: "/admin/entries", label: "Entries", icon: Newspaper, roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN] },
    ]
  },
  { href: "/admin/users", label: "User Management", icon: Users, roles: [UserRole.SUPER_ADMIN] },
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

    // Check if current item or any of its sub-items is active
    let itemIsActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
    if (item.subItems && !itemIsActive) {
        itemIsActive = item.subItems.some(sub => pathname.startsWith(sub.href));
    }
    
    const Icon = item.icon;
    const isMenuOpen = openMenus[item.label] || (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href)));

    if (item.subItems) { // This item has a sub-menu
      if (sidebarState === 'collapsed') {
        // Collapsed state: Render top-level item as a non-clickable icon/button
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
      // Expanded state: Render Accordion
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
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-0 pl-4">
              <SidebarMenuSub className="mx-0 border-l-0 px-0 py-1">
                {item.subItems.map(subItem => (
                  <SidebarMenuSubItem key={subItem.label}> {/* This is an <li> */}
                     {renderNavItem(subItem, true)} {/* Recursive call. isSubItem is true. */}
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    } else { // This item is a leaf node (no sub-menu)
      if (isSubItem) {
        // This is a leaf sub-item. It's already inside a <SidebarMenuSubItem> (<li>) from the caller.
        // So, just render the link/button directly.
        return (
          <SidebarMenuSubButton
            asChild
            isActive={itemIsActive} // itemIsActive is already calculated correctly for sub-items
          >
            <Link href={item.href} className="flex items-center gap-2">
              <Icon />
              <span className="truncate">{item.label}</span>
            </Link>
          </SidebarMenuSubButton>
        );
      } else {
        // This is a top-level item that is a direct link (no sub-menu).
        // It needs to be wrapped in <SidebarMenuItem> (<li>).
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

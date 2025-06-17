
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, UserCircle } from "lucide-react";
import { UserRole } from "@/types"; // Import UserRole

export function UserNav() {
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    return null;
  }

  const fallbackName = currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : currentUser.email.substring(0, 2).toUpperCase();
  const displayName = currentUser.name === "Admin" ? "Админ" : currentUser.name;

  let displayRole: string;
  switch (currentUser.role) {
    case UserRole.SUPER_ADMIN:
      displayRole = "Сүпер Админ";
      break;
    case UserRole.SUB_ADMIN:
      displayRole = "Дэд Админ";
      break;
    default:
      displayRole = currentUser.role;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentUser.avatar} alt={displayName || currentUser.email} data-ai-hint="user avatar" />
            <AvatarFallback>{fallbackName}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground mt-1">
              Үүрэг: {displayRole}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Профайл</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Гарах</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

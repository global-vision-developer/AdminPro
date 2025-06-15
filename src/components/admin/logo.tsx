"use client";
import { PanelsTopLeft } from "lucide-react";
import Link from "next/link";

export function Logo({ collapsed } : { collapsed?: boolean }) {
  return (
    <Link href="/admin/dashboard" className="flex items-center gap-2 px-2 py-1 text-primary hover:text-primary/90 transition-colors duration-150">
      <PanelsTopLeft className="h-7 w-7" />
      {!collapsed && <span className="text-xl font-headline font-semibold tracking-tight">Админ Про</span>}
    </Link>
  );
}

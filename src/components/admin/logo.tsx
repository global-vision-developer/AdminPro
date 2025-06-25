"use client";
import Link from "next/link";

export function Logo({ collapsed } : { collapsed?: boolean }) {
  return (
    <Link href="/admin/dashboard" className="flex items-center px-2 py-1 text-primary hover:text-primary/90 transition-colors duration-150">
      {!collapsed && <span className="text-xl font-headline font-semibold tracking-tight group-data-[collapsible=icon]:hidden">Админ Про</span>}
    </Link>
  );
}

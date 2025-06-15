"use client";

import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/types";
import { Users, Library, Newspaper, Activity } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { currentUser } = useAuth();

  const summaryCards = [
    { title: "Total Categories", value: "5", icon: Library, href: "/admin/categories", roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN] },
    { title: "Total Entries", value: "27", icon: Newspaper, href: "/admin/entries", roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN] },
    { title: "Registered Users", value: "3", icon: Users, href: "/admin/users", roles: [UserRole.SUPER_ADMIN] },
    // { title: "Recent Activity", value: "12", icon: Activity, href: "#" },
  ];

  if (!currentUser) return null;

  return (
    <>
      <PageHeader
        title={`Welcome, ${currentUser.name || currentUser.email}!`}
        description="Here's an overview of your content and system status."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => 
          (!card.roles || card.roles.includes(currentUser.role)) && (
          <Link href={card.href} key={card.title} legacyBehavior>
            <a className="hover:no-underline">
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border-l-4 border-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{card.value}</div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Mock data for demonstration
                  </p>
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-headline">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SUB_ADMIN ? (
            <>
              <Link href="/admin/categories/new" legacyBehavior>
                <Button variant="outline"><Library className="mr-2 h-4 w-4" /> Create Category</Button>
              </Link>
              <Link href="/admin/entries/new" legacyBehavior>
                <Button variant="outline"><Newspaper className="mr-2 h-4 w-4" /> Create Entry</Button>
              </Link>
            </>
          ) : null}
          {currentUser.role === UserRole.SUPER_ADMIN && (
            <Link href="/admin/users/new" legacyBehavior>
              <Button variant="outline"><Users className="mr-2 h-4 w-4" /> Add User</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </>
  );
}

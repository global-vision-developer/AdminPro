
"use client";

import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/types";
import { Users, Library, Newspaper, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { currentUser } = useAuth();

  const summaryCards = [
    { title: "Нийт төрөл", value: "5", icon: Library, href: "/admin/categories", roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN] },
    { title: "Нийт Оролт", value: "27", icon: Newspaper, href: "/admin/entries", roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN] },
    { title: "Бүртгэгдсэн Хэрэглэгчид", value: "3", icon: Users, href: "/admin/users", roles: [UserRole.SUPER_ADMIN] },
    // { title: "Recent Activity", value: "12", icon: Activity, href: "#" },
  ];

  if (!currentUser) return null;

  const displayName = currentUser.name === "Admin" ? "Админ" : currentUser.name;

  return (
    <>
      <PageHeader
        title={`Тавтай морил, ${displayName || currentUser.email}!`}
        description="таны системийн статус болон контентийн тойм."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) =>
          (!card.roles || card.roles.includes(currentUser.role)) && (
          <Link href={card.href} key={card.title} className="hover:no-underline">
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
                    демо дата(жишиг)
                  </p>
                </CardContent>
              </Card>
          </Link>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-headline">Командын цэс</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SUB_ADMIN ? (
            <>
              <Link href="/admin/categories/new">
                <Button variant="outline"><Library className="mr-2 h-4 w-4" /> Төрөл үүсгэх</Button>
              </Link>
              <Link href="/admin/entries/new">
                <Button variant="outline"><Newspaper className="mr-2 h-4 w-4" /> Оролт үүсгэх</Button>
              </Link>
            </>
          ) : null}
          {currentUser.role === UserRole.SUPER_ADMIN && (
            <Link href="/admin/users/new">
              <Button variant="outline"><Users className="mr-2 h-4 w-4" /> Хэрэглэгч үүсгэх</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </>
  );
}
    

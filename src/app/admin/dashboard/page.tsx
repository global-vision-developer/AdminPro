
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/types";
import { Users, Library, Newspaper, Activity, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from '@/lib/firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryCardData {
  title: string;
  value: string;
  icon: React.ElementType;
  href: string;
  roles?: UserRole[];
  isLoading: boolean;
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [categoryCount, setCategoryCount] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const [adminUserCount, setAdminUserCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoadingCounts(true);
      try {
        const categoriesCol = collection(db, "categories");
        const entriesCol = collection(db, "entries");
        const adminsCol = collection(db, "admins");

        const [categoriesSnapshot, entriesSnapshot, adminsSnapshot] = await Promise.all([
          getCountFromServer(categoriesCol),
          getCountFromServer(entriesCol),
          getCountFromServer(adminsCol),
        ]);

        setCategoryCount(categoriesSnapshot.data().count);
        setEntryCount(entriesSnapshot.data().count);
        setAdminUserCount(adminsSnapshot.data().count);

      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
        // Optionally set counts to a fallback or error indicator
        setCategoryCount(0);
        setEntryCount(0);
        setAdminUserCount(0);
      } finally {
        setLoadingCounts(false);
      }
    };

    if (currentUser) {
      fetchCounts();
    }
  }, [currentUser]);

  const summaryCards: SummaryCardData[] = [
    { 
      title: "Нийт категори", 
      value: categoryCount.toString(), 
      icon: Library, 
      href: "/admin/categories", 
      roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN],
      isLoading: loadingCounts 
    },
    { 
      title: "Нийт бүртгэл", 
      value: entryCount.toString(), 
      icon: Newspaper, 
      href: "/admin/entries", 
      roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN],
      isLoading: loadingCounts 
    },
    { 
      title: "Админ Хэрэглэгчид", 
      value: adminUserCount.toString(), 
      icon: Users, 
      href: "/admin/users", 
      roles: [UserRole.SUPER_ADMIN],
      isLoading: loadingCounts 
    },
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
                  {card.isLoading ? (
                    <Skeleton className="h-8 w-1/4" />
                  ) : (
                    <div className="text-3xl font-bold text-foreground">{card.value}</div>
                  )}
                  {/* "демо дата(жишиг)" text removed */}
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
                <Button variant="outline"><Library className="mr-2 h-4 w-4" /> Категори үүсгэх</Button>
              </Link>
              <Link href="/admin/entries/new">
                <Button variant="outline"><Newspaper className="mr-2 h-4 w-4" /> Бүртгэл үүсгэх</Button>
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
    

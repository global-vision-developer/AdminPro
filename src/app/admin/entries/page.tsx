
import React from 'react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { PlusCircle, Info, AlertTriangle } from 'lucide-react'; // Added Info, AlertTriangle

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { Category, Entry, UserProfile } from '@/types'; // Added UserProfile
import { UserRole } from '@/types'; // Added UserRole
import { getCategories } from '@/lib/actions/categoryActions';
import { getEntries } from '@/lib/actions/entryActions';
import { CategorySelector } from './components/category-selector';
import { EntryList } from './components/entry-list';
import { auth as firebaseAuthSDK } from '@/lib/firebase'; // To get current Firebase Auth user on server
import { cookies } from 'next/headers'; // To potentially get session info if stored
import { doc, getDoc } from 'firebase/firestore'; // To fetch admin details
import { db } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


async function getCurrentAdminUser(): Promise<UserProfile | null> {
  // This is a simplified way for server components. In a real app, you'd likely use NextAuth.js or a robust session management.
  // This example assumes you might have the UID from a session cookie or directly from Firebase Admin SDK if backend.
  // For client-side Firebase Auth, this direct access is not available on server.
  // We'll try to fetch based on an assumed UID (placeholder).
  // A proper solution needs actual session management.
  // For now, we'll assume we don't have user details here to force client-side logic for permission checks.
  return null; 
}


export default async function EntriesPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  noStore();

  // Fetching all categories and entries initially
  const allCategories = await getCategories();
  const selectedCategoryIdQuery = searchParams?.category;
  const entries = await getEntries(selectedCategoryIdQuery); 

  // The currentUser for permission checks will be handled client-side via useAuth hook in child components.
  // `CategorySelector` and `EntryList` will use `useAuth` to determine allowed categories for SubAdmins.
  
  const categoriesMap = allCategories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>);

  const noCategoriesExist = allCategories.length === 0;

  return (
    <>
      <PageHeader title="Контентын Бичлэгүүд" description="Manage content entries across all categories.">
        {/* Link to create new entry. The /new page will handle category restrictions for SubAdmins. */}
        <Link 
          href={`/admin/entries/new${selectedCategoryIdQuery && selectedCategoryIdQuery !== 'all' ? `?category=${selectedCategoryIdQuery}` : ''}`} 
          passHref
        >
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Шинэ Бичлэг Үүсгэх
          </Button>
        </Link>
      </PageHeader>

      {noCategoriesExist ? (
        <Card className="mt-6 shadow-lg">
          <CardContent className="py-10 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold">No Categories Found</h3>
            <p className="text-sm text-muted-foreground mb-4">To add entries, please create a category first. Only Super Admins can create categories.</p>
            {/* Assuming a way to check role on server (difficult without proper session) or hide via client: */}
            {/* For now, this button remains, and the categories/new page handles actual creation rights */}
            <Button asChild>
              <Link href="/admin/categories/new">Create Category</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <CategorySelector 
            allCategories={allCategories} // Pass all categories
            selectedCategoryIdForUrl={selectedCategoryIdQuery} 
          />
          <div className="mt-6">
            <EntryList 
                entries={entries} 
                categoriesMap={categoriesMap} 
                allCategories={allCategories} // Pass all for context if needed
            />
          </div>
        </>
      )}
    </>
  );
}

export const metadata = {
  title: "Бичлэгүүд | Админ Про",
};

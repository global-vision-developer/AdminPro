
import React from 'react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { Category, Entry } from '@/types';
import { getCategories } from '@/lib/actions/categoryActions';
import { getEntries } from '@/lib/actions/entryActions';
import { CategorySelector } from './components/category-selector';
import { EntryList } from './components/entry-list';

export default async function EntriesPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  noStore();
  const categories = await getCategories();
  
  // Determine selectedCategoryId: from URL param, or first category, or "all" if no specific param
  // CategorySelector will treat undefined or "all" similarly for its state
  const selectedCategoryIdQuery = searchParams?.category;
  const effectiveSelectedCategoryId = selectedCategoryIdQuery || (categories.length > 0 ? "all" : "all"); // Default to "all" if no specific query
                                                                                                          // Or could be categories[0].id if "all" is not desired as initial default

  const entries = await getEntries(selectedCategoryIdQuery); // getEntries handles undefined query to fetch all

  const categoriesMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>);

  return (
    <>
      <PageHeader title="Content Entries" description="Manage all your content entries across categories.">
        <Link 
          href={`/admin/entries/new${selectedCategoryIdQuery && selectedCategoryIdQuery !== 'all' ? `?category=${selectedCategoryIdQuery}` : ''}`} 
          passHref
        >
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Entry
          </Button>
        </Link>
      </PageHeader>

      <CategorySelector categories={categories} selectedCategoryId={selectedCategoryIdQuery} />

      {categories.length > 0 ? (
        <div className="mt-6">
          <EntryList entries={entries} categoriesMap={categoriesMap} />
        </div>
      ) : (
        <Card className="mt-6 shadow-lg">
          <CardContent className="py-10 text-center">
            <p className="text-lg text-muted-foreground">No categories found.</p>
            <p className="text-sm text-muted-foreground mb-4">Please create a category first to add entries.</p>
            <Button asChild>
              <Link href="/admin/categories/new">Create Category</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export const metadata = {
  title: "Entries | Админ Про",
};

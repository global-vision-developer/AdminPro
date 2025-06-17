
// "use client"; // Removed as data fetching will be server-side now
import React from 'react'; // Suspense can be used if needed for parts of page
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { PlusCircle, Edit, Trash2, Search, ListFilter, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { Category } from '@/types';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
// import { useToast } from '@/hooks/use-toast'; // Toasts will be handled by server actions or client components if needed

import { getCategories, deleteCategory } from '@/lib/actions/categoryActions';
import { DeleteCategoryButton } from './components/delete-category-button'; // Client component for delete confirmation

// Search and filter will need to be re-implemented, possibly client-side or with server-side search params
// For now, removing client-side useState for searchTerm and filters

export default async function CategoriesPage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  noStore(); // Opt out of caching for this page
  const categories = await getCategories();
  // const { toast } = useToast(); // Not available in Server Component

  const searchTerm = typeof searchParams?.search === 'string' ? searchParams.search : '';
  
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  return (
    <TooltipProvider>
      <PageHeader title="Контентийн ангилал" description="контент бүтэц удирдах хэсэг.">
        <Link href="/admin/categories/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Шинэ ангилал үүсгэх
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Basic server-side search (reloads page) - can be enhanced with client-side filtering or debouncing */}
            <form method="GET" action="/admin/categories" className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Ангилал хайх"
                defaultValue={searchTerm}
                className="pl-10"
              />
              {/* Hidden submit or rely on form submission on enter */}
            </form>
            {/* Filters will need to be client-side or server-side with query params */}
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked>Active</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu> */}
          </div>
        </CardHeader>
        <CardContent>
          {filteredCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Нэр</TableHead>
                    <TableHead className="hidden md:table-cell">Тайлбар</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Fields</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Сүүлд Шинэчилсэн</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/categories/${category.id}/edit`} className="hover:underline text-primary">
                          {category.name}
                        </Link>
                         <p className="text-xs text-muted-foreground md:hidden">{category.slug}</p>
                        <p className="text-xs text-muted-foreground md:hidden mt-1">{category.description?.substring(0,50)}...</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-sm truncate">
                        {category.description || <span className="text-muted-foreground italic">No description</span>}
                        <p className="text-xs text-muted-foreground mt-1">Slug: {category.slug}</p>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <Badge variant="secondary">{category.fields.length}</Badge>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {category.updatedAt ? new Date(category.updatedAt).toLocaleDateString() : <span className="text-muted-foreground italic">N/A</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/admin/categories/${category.id}/edit`} passHref>
                                <Button variant="ghost" size="icon" aria-label="Edit category">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Edit category</TooltipContent>
                          </Tooltip>
                          <DeleteCategoryButton categoryId={category.id} categoryName={category.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Library className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No categories found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "Try modifying your search." : "Get started by creating a new category."}
              </p>
              {!searchTerm && (
                <Button asChild className="mt-4">
                  <Link href="/admin/categories/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Category
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export const metadata = {
  title: "Categories | Admin Pro",
};


"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, Edit, Trash2, Search, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { Category } from '@/types';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCategories } from '@/lib/actions/categoryActions';
import { DeleteCategoryButton } from './components/delete-category-button';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Role-based access control
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
        toast({
          title: "Хандалт хориглогдсон",
          description: "Та категорийн жагсаалтыг харах эрхгүй байна.",
          variant: "destructive"
        });
        router.push('/admin/dashboard');
      }
    }
  }, [currentUser, authLoading, router, toast]);

  // Data fetching
  const fetchCategories = useCallback(async () => {
    if (currentUser && currentUser.role === UserRole.SUPER_ADMIN) {
      setIsLoading(true);
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        toast({ title: "Алдаа", description: "Категориудыг ачааллахад алдаа гарлаа.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [currentUser, toast]);
  
  useEffect(() => {
    if (!authLoading && currentUser?.role === UserRole.SUPER_ADMIN) {
      fetchCategories();
    }
  }, [authLoading, currentUser, fetchCategories]);


  const filteredCategories = useMemo(() => {
    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [categories, searchTerm]);

  if (authLoading || isLoading) {
    return (
      <>
        <PageHeader title="Контентийн ангилал" description="контент бүтэц удирдах хэсэг."/>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-10 w-full sm:max-w-xs" />
          </CardHeader>
          <CardContent className="space-y-3 mt-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </>
    );
  }

  if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
      return <PageHeader title="Хандалт хориглогдсон" description="Хуудас руу шилжиж байна..." />;
  }

  return (
    <TooltipProvider>
      <PageHeader title="Контентийн ангилал" description="контент бүтэц удирдах хэсэг.">
        <Link href="/admin/categories/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Шинэ категори үүсгэх
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Категори хайх"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
                    <TableHead className="text-center hidden sm:table-cell">Талбар</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Шинэчилсэн огноо</TableHead>
                    <TableHead className="text-right">Нэмэлт үйлдлүүд</TableHead>
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
                        {category.description || <span className="text-muted-foreground italic">Тайлбаргүй</span>}
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
                            <TooltipContent>Засах</TooltipContent>
                          </Tooltip>
                          <DeleteCategoryButton 
                            categoryId={category.id} 
                            categoryName={category.name}
                            onSuccess={fetchCategories}
                           />
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
              <h3 className="mt-4 text-lg font-semibold">Категори олдсонгүй</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "Хайлтаа өөрчилж үзнэ үү." : "Шинэ категори үүсгэж эхэлнэ үү."}
              </p>
              {!searchTerm && (
                <Button asChild className="mt-4">
                  <Link href="/admin/categories/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Категори үүсгэх
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

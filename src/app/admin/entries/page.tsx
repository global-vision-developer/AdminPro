"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PlusCircle, Edit, Trash2, Eye, Search, ListFilter, CalendarClock, CheckCircle, Edit3, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { Entry, Category } from '@/types';
import { mockEntries, mockCategories } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    setEntries(mockEntries);
    setCategories(mockCategories);
  }, []);

  const getCategoryName = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || 'Unknown Category';
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const title = entry.title || entry.data?.title || entry.data?.productName || 'Untitled Entry';
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategoryFilter === 'all' || entry.categoryId === selectedCategoryFilter;
      const matchesStatus = selectedStatusFilter === 'all' || entry.status === selectedStatusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [entries, searchTerm, selectedCategoryFilter, selectedStatusFilter]);

  const handleDeleteEntry = (entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
    toast({
      title: "Entry Deleted",
      description: `Entry with ID ${entryId} has been removed.`,
    });
  };

  const getStatusBadge = (status: Entry['status']) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3 w-3" />Published</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Edit3 className="mr-1 h-3 w-3" />Draft</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><CalendarClock className="mr-1 h-3 w-3" />Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <PageHeader title="Content Entries" description="Manage all your content entries across categories.">
        <Link href="/admin/entries/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Entry
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEntries.length > 0 ? (
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Publish Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <Link href={`/admin/entries/${entry.id}/edit`} className="hover:underline text-primary">
                          {entry.title || entry.data?.title || entry.data?.productName || 'Untitled Entry'}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{getCategoryName(entry.categoryId)}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(entry.status)}</TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {entry.publishAt ? new Date(entry.publishAt).toLocaleDateString() : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="View entry" disabled>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Entry (coming soon)</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/admin/entries/${entry.id}/edit`} passHref>
                                <Button variant="ghost" size="icon" aria-label="Edit entry">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Edit Entry</TooltipContent>
                          </Tooltip>
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" aria-label="Delete entry">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Entry</TooltipContent>
                              </Tooltip>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the entry titled "{(entry.title || entry.data?.title || entry.data?.productName || 'Untitled Entry')}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Newspaper className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No entries found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || selectedCategoryFilter !== 'all' || selectedStatusFilter !== 'all' ? "Try adjusting your search or filters." : "Get started by creating a new entry."}
              </p>
              {!(searchTerm || selectedCategoryFilter !== 'all' || selectedStatusFilter !== 'all') && (
                <Button asChild className="mt-4">
                  <Link href="/admin/entries/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Entry
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

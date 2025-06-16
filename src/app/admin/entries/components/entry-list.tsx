
"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Entry, Category, FieldDefinition } from "@/types";
import { FieldType } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3, Trash2, Newspaper, CalendarClock, CheckCircle, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteEntry } from "@/lib/actions/entryActions";
import { format, parseISO } from "date-fns";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EntryListProps {
  entries: Entry[];
  categoriesMap: Record<string, Category>; 
}

export function EntryList({ entries, categoriesMap }: EntryListProps) {
  const { toast } = useToast();
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);

  const handleDeleteConfirm = (entry: Entry) => {
    setEntryToDelete(entry);
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    const result = await deleteEntry(entryToDelete.id);
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Entry "${entryToDelete.title || 'Untitled'}" deleted.`,
      });
      // Revalidation is handled by the server action
    }
    setEntryToDelete(null); // Close dialog
  };

  const getDisplayValue = (value: any, field: FieldDefinition): React.ReactNode => {
    if (value === null || typeof value === 'undefined' || value === "") return <span className="text-xs text-muted-foreground italic">N/A</span>;
    
    switch (field.type) {
        case FieldType.DATE:
            try {
                const dateValue = (typeof value === 'string' || typeof value === 'number' || value instanceof Date) ? parseISO(value as string) : null;
                if (dateValue && !isNaN(dateValue.getTime())) {
                    return format(dateValue, "PP");
                }
                return String(value); 
            } catch {
                return String(value); 
            }
        case FieldType.BOOLEAN:
            return value ? "Yes" : "No";
        case FieldType.NUMBER:
            return value.toLocaleString();
        case FieldType.TEXT:
            // Special handling for image URLs if the key indicates it
            if ((field.key === 'nuur-zurag-url' || field.key === 'coverImage' || field.key === 'thumbnailUrl') && typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                 return (
                    <div className="flex items-center space-x-2 w-32">
                        <Image 
                        data-ai-hint="preview thumbnail"
                        src={value} 
                        alt={field.label || "Preview"}
                        width={32} 
                        height={32} 
                        className="rounded object-cover h-8 w-8 border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate" title={value}>
                        Link
                        </a>
                    </div>
                );
            }
            // Fallthrough for regular text
        case FieldType.TEXTAREA:
            const stringValue = String(value);
            return stringValue.length > 30 ? stringValue.substring(0, 27) + "..." : stringValue;
        default:
            const defaultStringValue = String(value);
            return defaultStringValue.length > 30 ? defaultStringValue.substring(0, 27) + "..." : defaultStringValue;
    }
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
  
  if (entries.length === 0) {
    return (
       <Card className="mt-8 shadow-lg">
        <CardContent className="py-12 text-center">
            <Newspaper className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold font-headline">No Entries Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
            There are no entries for the selected category, or no entries have been created yet.
            </p>
        </CardContent>
       </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Entry List</CardTitle>
          <CardDescription>View, edit, or delete existing entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[150px]">Category</TableHead>
                  <TableHead className="min-w-[150px]">Key Data Preview</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Published</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const category = categoriesMap[entry.categoryId];
                  // Display first 2-3 fields, or fewer if category has fewer.
                  const previewFields = category?.fields?.filter(f => !f.description?.includes("аппликейшний хэрэглэгчид бөглөнө")).slice(0, 2) || []; 
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/entries/${entry.id}/edit`} className="hover:underline text-primary">
                          {entry.title || 'Untitled Entry'}
                        </Link>
                        <p className="text-xs text-muted-foreground md:hidden mt-1">{entry.categoryName || 'N/A'}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{entry.categoryName || <span className="italic text-muted-foreground">N/A</span>}</TableCell>
                      <TableCell>
                        {previewFields.length > 0 ? previewFields.map(pf => (
                          <div key={pf.key} className="text-xs mb-1 last:mb-0 overflow-hidden whitespace-nowrap">
                            <span className="font-semibold">{pf.label}:</span> {getDisplayValue(entry.data[pf.key], pf)}
                          </div>
                        )) : <span className="text-xs text-muted-foreground italic">No preview fields.</span>}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">{getStatusBadge(entry.status)}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {entry.publishAt ? format(parseISO(entry.publishAt), "PP") : <span className="text-muted-foreground italic">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="View entry" disabled>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View (coming soon)</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/admin/entries/${entry.id}/edit`} passHref>
                                <Button variant="ghost" size="icon" aria-label="Edit entry">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Edit Entry</TooltipContent>
                          </Tooltip>
                          <AlertDialog open={entryToDelete?.id === entry.id} onOpenChange={(open) => !open && setEntryToDelete(null)}>
                            <AlertDialogTrigger asChild>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteConfirm(entry)} aria-label="Delete entry">
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
                                  This action cannot be undone. This will permanently delete the entry titled "{entryToDelete?.title || 'Untitled Entry'}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

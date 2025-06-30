
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Entry, Category, FieldDefinition, ImageGalleryItemStored } from "@/types";
import { FieldType, UserRole } from "@/types"; // Added UserRole
import { useAuth } from "@/hooks/use-auth"; // Added useAuth
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3, Trash2, Newspaper, CalendarClock, CheckCircle, Eye, ImageIcon, Info, AlertTriangle } from "lucide-react"; // Added Info, AlertTriangle
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface EntryListProps {
  entries: Entry[];
  categoriesMap: Record<string, Category>; 
  allCategories: Category[]; // Pass all categories for context
}

export function EntryList({ entries, categoriesMap, allCategories }: EntryListProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);

  const filteredEntriesForSubAdmin = useMemo(() => {
    if (currentUser && currentUser.role === UserRole.SUB_ADMIN) {
      if (currentUser.allowedCategoryIds && currentUser.allowedCategoryIds.length > 0) {
        return entries.filter(entry => currentUser.allowedCategoryIds!.includes(entry.categoryId));
      }
      return []; // SubAdmin has no allowed categories or none are assigned.
    }
    return entries; // SuperAdmin sees all entries passed
  }, [entries, currentUser]);


  const handleDeleteConfirm = (entry: Entry) => {
    setEntryToDelete(entry);
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    const result = await deleteEntry(entryToDelete.id);
    if (result.error) {
      toast({
        title: "Алдаа",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Амжилттай",
        description: `Бүртгэл "${entryToDelete.title || 'Гарчиггүй бүртгэл'}" устгагдлаа.`,
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
            return value ? "Тийм" : "Үгүй";
        case FieldType.NUMBER:
            return value.toLocaleString();
        case FieldType.IMAGE:
            if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image'))) {
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
                        Линк
                    </a>
                </div>
                );
            }
            return <span className="text-xs text-muted-foreground italic">Зураггүй</span>;
        case FieldType.IMAGE_GALLERY:
            if (Array.isArray(value) && value.length > 0) {
                const galleryValue = value as ImageGalleryItemStored[];
                const firstImage = galleryValue.find(item => item.imageUrl);
                return (
                    <div className="flex items-center space-x-1 text-xs">
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{galleryValue.length} {galleryValue.length === 1 ? "зураг" : "зураг"}</span>
                        {firstImage?.imageUrl && (
                             <Image 
                                data-ai-hint="gallery preview"
                                src={firstImage.imageUrl} // Can be data URI or URL
                                alt={firstImage.description || "Gallery preview"}
                                width={20} 
                                height={20} 
                                className="rounded object-cover h-5 w-5 border ml-1"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                             />
                        )}
                    </div>
                );
            }
            return <span className="text-xs text-muted-foreground italic">Хоосон галлери</span>;
        case FieldType.TEXT:
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
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3 w-3" />Нийтлэгдсэн</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Edit3 className="mr-1 h-3 w-3" />Ноорог</Badge>; 
      case 'scheduled':
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><CalendarClock className="mr-1 h-3 w-3" />Хуваарьт</Badge>; 
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (allCategories.length === 0) { 
    return (
       <Card className="mt-8 shadow-lg">
        <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold font-headline">Категори үүсээгүй байна</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Эхлээд категори үүсгэнэ үү.
            </p>
        </CardContent>
       </Card>
    );
  }

  if (currentUser && currentUser.role === UserRole.SUB_ADMIN && (!currentUser.allowedCategoryIds || currentUser.allowedCategoryIds.length === 0)) {
    return (
        <Alert variant="default" className="mt-6 border-primary/50">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold text-primary">Оноосон категори байхгүй</AlertTitle>
            <AlertDescription>
                Танд бүртгэл удирдах категори оноогоогүй байна. 
                Сүпер Админаас категори оноох хүсэлт гаргана уу.
            </AlertDescription>
        </Alert>
    );
  }
  
  if (filteredEntriesForSubAdmin.length === 0) {
    return (
       <Card className="mt-8 shadow-lg">
        <CardContent className="py-12 text-center">
            <Newspaper className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold font-headline">Бүртгэл олдсонгүй</h3> 
            <p className="mt-1 text-sm text-muted-foreground">
            Сонгосон (эсвэл танд зөвшөөрөгдсөн) категорид бүртгэл олдсонгүй, эсвэл хараахан бүртгэл үүсгээгүй байна.
            </p>
        </CardContent>
       </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Бүртгэлийн жагсаалт</CardTitle> 
          <CardDescription>бүртгэлийг үзэх, засах, устгах</CardDescription> 
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Гарчиг</TableHead> 
                  <TableHead className="hidden md:table-cell min-w-[150px]">Категори</TableHead>
                  <TableHead className="min-w-[150px]">Үндсэн дата тойм</TableHead> 
                  <TableHead className="text-center hidden sm:table-cell">Төлөв</TableHead> 
                  <TableHead className="text-center hidden md:table-cell">Нийтлэгдсэн</TableHead> 
                  <TableHead className="text-right w-[120px]">Нэмэлт үйлдлүүд</TableHead> 
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntriesForSubAdmin.map((entry) => {
                  const category = categoriesMap[entry.categoryId];
                  const previewFields = category?.fields?.filter(f => !f.description?.includes("Энэ талбарыг админ биш, аппын хэрэглэгчид бөглөнө.")).slice(0, 2) || []; 
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/entries/${entry.id}/edit`} className="hover:underline text-primary">
                          {entry.title || 'Гарчиггүй бүртгэл'} 
                        </Link>
                        <p className="text-xs text-muted-foreground md:hidden mt-1">{entry.categoryName || categoriesMap[entry.categoryId]?.name || 'Үл мэдэгдэх категори'}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{entry.categoryName || categoriesMap[entry.categoryId]?.name || <span className="italic text-muted-foreground">N/A</span>}</TableCell>
                      <TableCell>
                        {previewFields.length > 0 ? previewFields.map(pf => (
                          <div key={pf.key} className="text-xs mb-1 last:mb-0 overflow-hidden whitespace-nowrap">
                            <span className="font-semibold">{pf.label}:</span> {getDisplayValue(entry.data[pf.key], pf)}
                          </div>
                        )) : <span className="text-xs text-muted-foreground italic">Урьдчилж харах талбар алга.</span>} 
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">{getStatusBadge(entry.status)}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {entry.publishAt ? format(parseISO(entry.publishAt), "PP") : <span className="text-muted-foreground italic">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Бүртгэл үзэх" disabled> 
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Харах (удахгүй)</TooltipContent> 
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/admin/entries/${entry.id}/edit`} passHref>
                                <Button variant="ghost" size="icon" aria-label="Бүртгэл засах"> 
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Бүртгэл засах</TooltipContent> 
                          </Tooltip>
                          <AlertDialog open={entryToDelete?.id === entry.id} onOpenChange={(open) => !open && setEntryToDelete(null)}>
                            <AlertDialogTrigger asChild>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteConfirm(entry)} aria-label="Бүртгэл устгах"> 
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Бүртгэл устгах</TooltipContent> 
                              </Tooltip>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle> 
                                <AlertDialogDescription>
                                  Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{entryToDelete?.title || 'Гарчиггүй бүртгэл'}" нэртэй бүртгэлийг бүрмөсөн устгах болно.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Цуцлах</AlertDialogCancel> 
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                  Устгах
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

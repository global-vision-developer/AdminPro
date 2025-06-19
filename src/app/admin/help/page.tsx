
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as UiDialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as UiAlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { HelpItem } from '@/types';
import { HelpTopic, UserRole, HELP_TOPIC_DISPLAY_NAMES } from '@/types';
import { getHelpItems, addHelpItem, updateHelpItem, deleteHelpItem, type AddHelpItemData, type UpdateHelpItemData } from '@/lib/actions/helpActions';
import { Loader2, PlusCircle, BookOpen, Plane, HelpCircle, Edit3, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const helpItemFormSchema = z.object({
  topic: z.nativeEnum(HelpTopic, { required_error: "Сэдэв сонгоно уу." }),
  question: z.string().min(1, "Асуулт хоосон байж болохгүй."),
  answer: z.string().min(1, "Хариулт хоосон байж болохгүй."),
});
export type HelpItemFormValues = z.infer<typeof helpItemFormSchema>;

export default function HelpPage() {
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<HelpTopic | "all_topics">("all_topics");
  const [helpItems, setHelpItems] = useState<HelpItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingHelpItem, setEditingHelpItem] = useState<HelpItem | null>(null);

  const [itemToDelete, setItemToDelete] = useState<HelpItem | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  const { toast } = useToast();
  const { currentUser } = useAuth();

  const form = useForm<HelpItemFormValues>({
    resolver: zodResolver(helpItemFormSchema),
    defaultValues: {
      topic: HelpTopic.APPLICATION_GUIDE, // Default to "1"
      question: '',
      answer: '',
    },
  });

  useEffect(() => {
    async function fetchItems() {
      setIsLoadingItems(true);
      try {
        const effectiveFilter = selectedTopicFilter === "all_topics" ? undefined : selectedTopicFilter;
        const items = await getHelpItems(effectiveFilter);
        setHelpItems(items);
      } catch (error) {
        console.error("Failed to fetch help items:", error);
        toast({ title: "Алдаа", description: "Тусламжийн мэдээллийг ачааллахад алдаа гарлаа.", variant: "destructive" });
        setHelpItems([]);
      } finally {
        setIsLoadingItems(false);
      }
    }
    fetchItems();
  }, [selectedTopicFilter, toast]);

  const handleTopicFilterChange = (topicValue: string) => {
    setSelectedTopicFilter(topicValue as HelpTopic | "all_topics");
  };

  const handleOpenFormDialog = (item?: HelpItem) => {
    if (!currentUser || (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.SUB_ADMIN)) {
        toast({ title: "Алдаа", description: "Энэ үйлдлийг хийхэд таны эрх хүрэлцэхгүй байна.", variant: "destructive" });
        return;
    }
    if (item) {
      setEditingHelpItem(item);
      form.reset({
        topic: item.topic,
        question: item.question,
        answer: item.answer,
      });
    } else {
      setEditingHelpItem(null);
      form.reset({
        topic: selectedTopicFilter === "all_topics" ? HelpTopic.APPLICATION_GUIDE : selectedTopicFilter,
        question: '',
        answer: '',
      });
    }
    setIsFormDialogOpen(true);
  };

  const handleSaveHelpItem = async (values: HelpItemFormValues) => {
    if (!currentUser || (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.SUB_ADMIN)) {
        toast({ title: "Алдаа", description: "Эрх хүрэлцэхгүй байна. Та админ эрхтэй эсэхээ шалгана уу.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    let result;
    
    if (editingHelpItem) {
      const updateData: UpdateHelpItemData = { topic: values.topic, question: values.question, answer: values.answer };
      result = await updateHelpItem(editingHelpItem.id, updateData);
    } else {
      const addData: AddHelpItemData = { ...values, adminId: currentUser.id };
      result = await addHelpItem(addData);
    }
    setIsSubmitting(false);

    if (result && ("id" in result || ("success" in result && result.success))) {
      toast({ title: "Амжилттай", description: `Тусламжийн зүйл ${editingHelpItem ? "шинэчлэгдлээ" : "нэмэгдлээ"}.` });
      setIsFormDialogOpen(false);
      setEditingHelpItem(null);
      const effectiveFilter = selectedTopicFilter === "all_topics" ? undefined : selectedTopicFilter;
      const updatedItems = await getHelpItems(effectiveFilter);
      setHelpItems(updatedItems);
    } else if (result && "error" in result ) {
      toast({ title: "Алдаа", description: result.error, variant: "destructive" });
    }
  };

  const handleDeleteClick = (item: HelpItem) => {
    if (!currentUser || (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.SUB_ADMIN)) {
        toast({ title: "Алдаа", description: "Энэ үйлдлийг хийхэд таны эрх хүрэлцэхгүй байна.", variant: "destructive" });
        return;
    }
    setItemToDelete(item);
    setShowDeleteConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !currentUser || (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.SUB_ADMIN)) {
        toast({ title: "Алдаа", description: "Устгах үйлдэл хийхэд алдаа гарлаа. Эрхээ шалгана уу.", variant: "destructive" });
        setShowDeleteConfirmDialog(false);
        setItemToDelete(null);
        return;
    }
    setIsSubmitting(true);
    const result = await deleteHelpItem(itemToDelete.id);
    setIsSubmitting(false);
    setShowDeleteConfirmDialog(false);

    if (result.success) {
      toast({ title: "Амжилттай", description: `"${itemToDelete.question.substring(0,30)}..." асуулт устгагдлаа.` });
      const effectiveFilter = selectedTopicFilter === "all_topics" ? undefined : selectedTopicFilter;
      const updatedItems = await getHelpItems(effectiveFilter);
      setHelpItems(updatedItems);
      setItemToDelete(null);
    } else if (result.error) {
      toast({ title: "Алдаа", description: result.error, variant: "destructive" });
      setItemToDelete(null);
    }
  };

  const getTopicIcon = (topicId?: HelpTopic | "all_topics") => {
    if (!topicId || topicId === "all_topics") return <HelpCircle className="mr-2 h-5 w-5 text-primary" />;
    if (topicId === HelpTopic.APPLICATION_GUIDE) return <BookOpen className="mr-2 h-5 w-5 text-primary" />;
    if (topicId === HelpTopic.TRAVEL_TIPS) return <Plane className="mr-2 h-5 w-5 text-primary" />;
    return <HelpCircle className="mr-2 h-5 w-5 text-primary" />;
  };

  const getTopicDisplayName = (topicId?: HelpTopic | "all_topics") => {
    if (!topicId) return "Тодорхойгүй сэдэв";
    return HELP_TOPIC_DISPLAY_NAMES[topicId] || "Тодорхойгүй сэдэв";
  }

  return (
    <>
      <PageHeader title="Тусламж" description="Түгээмэл асуулт хариулт (FAQ) нэмэх, засварлах, устгах.">
        {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.SUB_ADMIN) && (
            <Button onClick={() => handleOpenFormDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Шинэ Асуулт/Хариулт Нэмэх
            </Button>
        )}
      </PageHeader>

      <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          if(!open) {
              setEditingHelpItem(null);
              form.reset({ topic: selectedTopicFilter === "all_topics" ? HelpTopic.APPLICATION_GUIDE : selectedTopicFilter, question: '', answer: ''});
          }
          setIsFormDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingHelpItem ? "Асуулт/Хариулт Засварлах" : "Шинэ Асуулт/Хариулт Нэмэх"}</DialogTitle>
            <UiDialogDescription>
              {editingHelpItem ? "Одоо байгаа асуулт, хариултыг өөрчилнө үү." : "Хэрэглэгчдэд туслах шинэ асуулт, хариултыг оруулна уу."}
            </UiDialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveHelpItem)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сэдэв</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Сэдэв сонгоно уу..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(HelpTopic).map(topicValue => (
                          <SelectItem key={topicValue} value={topicValue}>{HELP_TOPIC_DISPLAY_NAMES[topicValue]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Асуулт</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Асуултаа энд бичнэ үү..." {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Хариулт</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Хариултаа энд дэлгэрэнгүй бичнэ үү..." {...field} rows={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)} disabled={isSubmitting}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Хадгалах
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <UiAlertDialogTitle>Та итгэлтэй байна уу?</UiAlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. "{itemToDelete?.question.substring(0,50)}..." асуултыг бүрмөсөн устгах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={isSubmitting}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-6 max-w-xs">
        <Label htmlFor="topic-filter-select">Сэдвээр шүүх</Label>
        <Select
          onValueChange={handleTopicFilterChange}
          value={selectedTopicFilter} 
        >
          <SelectTrigger id="topic-filter-select" className="w-full mt-1">
            <SelectValue placeholder="Сэдэв сонгоно уу..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_topics">{HELP_TOPIC_DISPLAY_NAMES["all_topics"]}</SelectItem>
            {Object.values(HelpTopic).map(topicValue => (
              <SelectItem key={topicValue} value={topicValue}>
                {HELP_TOPIC_DISPLAY_NAMES[topicValue]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-lg min-h-[400px]">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            {getTopicIcon(selectedTopicFilter)}
            {getTopicDisplayName(selectedTopicFilter)}
          </CardTitle>
          <CardDescription>
            {selectedTopicFilter === "all_topics" ? "Бүх нийтлэг асуулт, хариултууд." : `"${getTopicDisplayName(selectedTopicFilter)}" сэдэвтэй холбоотой нийтлэг асуулт, хариултууд.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingItems ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : helpItems.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-3">
              {helpItems.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border bg-background rounded-md shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between p-4">
                    <AccordionTrigger className="text-left hover:no-underline focus:no-underline flex-1 py-0 pr-2">
                      <span className="font-medium text-foreground">{item.question}</span>
                    </AccordionTrigger>
                    {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.SUB_ADMIN) && (
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenFormDialog(item)} aria-label="Засах">
                                <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} className="text-destructive hover:text-destructive/90" aria-label="Устгах">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                  </div>
                  <AccordionContent className="p-4 pt-0">
                    <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
                      {item.answer}
                    </div>
                     {item.topic && (
                        <p className="text-xs text-muted-foreground/70 mt-2">
                            Сэдэв: {HELP_TOPIC_DISPLAY_NAMES[item.topic] || item.topic}
                        </p>
                    )}
                     {item.createdAt && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Нэмсэн: {new Date(item.createdAt).toLocaleDateString()}
                            {item.updatedAt && new Date(item.updatedAt).getTime() !== new Date(item.createdAt).getTime() ? ` | Засварласан: ${new Date(item.updatedAt).toLocaleDateString()}` : ''}
                        </p>
                    )}
                     {item.createdBy && (
                        <p className="text-xs text-muted-foreground/70">
                           Админ ID: {item.createdBy.substring(0,5)}...
                        </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {selectedTopicFilter === "all_topics" ? "Харуулах асуулт, хариулт алга." : `"${getTopicDisplayName(selectedTopicFilter)}" сэдэвтэй холбоотой нийтлэг асуулт олдсонгүй.`}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

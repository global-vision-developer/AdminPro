
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Category, Entry, FieldDefinition } from '@/types';
import { FieldType } from '@/types';
import { CalendarIcon, Save, Loader2, Wand2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { suggestContent } from '@/ai/flows/suggest-content-on-schedule';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EntryFormProps {
  initialData?: Entry | null;
  categories: Category[];
  onSubmit: (data: any) => Promise<void>; // Data will be dynamic
  isSubmitting: boolean;
}

export function EntryForm({ initialData, categories, onSubmit, isSubmitting }: EntryFormProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(initialData?.categoryId);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(
    initialData ? categories.find(c => c.id === initialData.categoryId) : undefined
  );
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Dynamic Zod schema generation
  const generateSchema = useCallback((fields: FieldDefinition[] = []) => {
    const shape: Record<string, z.ZodTypeAny> = {
      categoryId: z.string().min(1, "Category is required."),
      status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
      publishAt: z.date().optional(),
      // Add other common fields if any, like a main title
      entryTitle: z.string().optional(), // Generic title for the entry itself
    };

    fields.forEach(field => {
      let fieldSchema: z.ZodTypeAny;
      switch (field.type) {
        case FieldType.TEXT:
        case FieldType.TEXTAREA:
          fieldSchema = z.string();
          break;
        case FieldType.NUMBER:
          fieldSchema = z.coerce.number(); // Coerce string from input to number
          break;
        case FieldType.DATE:
          fieldSchema = z.date();
          break;
        case FieldType.BOOLEAN:
          fieldSchema = z.boolean();
          break;
        default:
          fieldSchema = z.any();
      }
      if (field.required) {
        if (fieldSchema instanceof z.ZodString) {
          fieldSchema = fieldSchema.min(1, `${field.label} is required.`);
        } else {
           fieldSchema = fieldSchema.refine(val => val !== undefined && val !== null && val !== '', {
            message: `${field.label} is required.`,
          });
        }
      } else {
        fieldSchema = fieldSchema.optional().nullable();
      }
      shape[`data.${field.id}`] = fieldSchema;
    });
    return z.object(shape);
  }, []);
  
  const [currentSchema, setCurrentSchema] = useState(() => generateSchema(selectedCategory?.fields));

  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: initialData ? {
        ...initialData,
        publishAt: initialData.publishAt ? parseISO(initialData.publishAt) : undefined,
        entryTitle: initialData.title,
      } : {
        categoryId: '',
        status: 'draft',
        data: {},
      },
  });
  
  useEffect(() => {
     const newSchema = generateSchema(selectedCategory?.fields);
     setCurrentSchema(newSchema);
     
     // Re-initialize form with new schema, preserving common fields and existing data
     const currentValues = form.getValues();
     const defaultValuesForNewSchema: Record<string, any> = {
       categoryId: currentValues.categoryId,
       status: currentValues.status,
       publishAt: currentValues.publishAt,
       entryTitle: currentValues.entryTitle,
       data: {},
     };

     selectedCategory?.fields.forEach(field => {
        if(currentValues.data && currentValues.data[field.id] !== undefined) {
            defaultValuesForNewSchema.data[field.id] = currentValues.data[field.id];
        } else {
             // Set default for new fields if needed, e.g., boolean to false
            if (field.type === FieldType.BOOLEAN) defaultValuesForNewSchema.data[field.id] = false;
        }
     });
     
     form.reset(defaultValuesForNewSchema, {
       keepDirtyValues: true, // try to keep user's changes if field still exists
       keepErrors: false, // clear previous errors
     });

  }, [selectedCategory, generateSchema, form]);


  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategory(category);
    form.setValue('categoryId', categoryId);
    form.reset({ ...form.getValues(), categoryId, data: {} }, { keepDirtyValues: false }); // Reset data part of form
  };

  const handleGetSuggestions = async () => {
    if (!selectedCategory) {
      setAiError("Please select a category first.");
      return;
    }
    const formData = form.getValues().data;
    let entryContent = "";
    // Attempt to find a primary content field or concatenate text fields
    const contentField = selectedCategory.fields.find(f => f.type === FieldType.TEXTAREA && (f.label.toLowerCase().includes('content') || f.label.toLowerCase().includes('body')));
    if (contentField && formData[contentField.id]) {
      entryContent = String(formData[contentField.id]);
    } else {
      // Fallback: concatenate all string-based fields
      selectedCategory.fields.forEach(field => {
        if ((field.type === FieldType.TEXT || field.type === FieldType.TEXTAREA) && formData[field.id]) {
          entryContent += `${field.label}: ${formData[field.id]}\n`;
        }
      });
    }

    if (!entryContent.trim()) {
      setAiError("Please provide some content in the entry fields.");
      return;
    }

    setIsSuggesting(true);
    setAiError(null);
    setAiSuggestions([]);
    try {
      const result = await suggestContent({ entryContent, category: selectedCategory.name });
      setAiSuggestions(result.suggestions);
    } catch (error) {
      console.error("AI suggestion error:", error);
      setAiError("Failed to get suggestions. Please try again.");
    }
    setIsSuggesting(false);
  };
  
  const watchStatus = form.watch('status');

  const transformedSubmit = (data: z.infer<typeof currentSchema>) => {
    const entryTitle = data.entryTitle || data.data?.[selectedCategory?.fields.find(f=>f.label.toLowerCase() === 'title')?.id || ''] || 'Untitled Entry';
    const submissionData = {
        ...data,
        title: entryTitle, // ensure title is top-level for display
        publishAt: data.publishAt ? data.publishAt.toISOString() : undefined,
    };
    delete submissionData.entryTitle; // remove temporary field
    onSubmit(submissionData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(transformedSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Entry Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={handleCategoryChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="entryTitle"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Entry Title (for display)</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter a representative title for this entry" {...field} />
                        </FormControl>
                        <FormDescription>This title is used for lists and overviews. If your category has a 'Title' field, it might be automatically populated from there too.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                 />

                {selectedCategory?.fields.map(catField => (
                  <FormField
                    key={catField.id}
                    control={form.control}
                    name={`data.${catField.id}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{catField.label}{catField.required && <span className="text-destructive">*</span>}</FormLabel>
                        <FormControl>
                          <>
                            {catField.type === FieldType.TEXT && <Input placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} {...field} value={field.value || ''} />}
                            {catField.type === FieldType.TEXTAREA && <Textarea placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} {...field} value={field.value || ''} rows={5} />}
                            {catField.type === FieldType.NUMBER && <Input type="number" placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value))}/>}
                            {catField.type === FieldType.BOOLEAN && (
                              <div className="flex items-center space-x-2 h-10">
                                <Checkbox id={`data.${catField.id}`} checked={field.value} onCheckedChange={field.onChange} />
                                <label htmlFor={`data.${catField.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {catField.placeholder || 'Enable'}
                                </label>
                              </div>
                            )}
                            {catField.type === FieldType.DATE && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value instanceof Date ? field.value : parseISO(field.value as unknown as string), "PPP") : <span>{catField.placeholder || 'Pick a date'}</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={field.value instanceof Date ? field.value : (field.value ? parseISO(field.value as unknown as string) : undefined)}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                          </>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>
             {selectedCategory && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center"><Wand2 className="mr-2 h-5 w-5 text-primary"/>AI Content Suggestions</CardTitle>
                  <CardDescription>Get AI-powered suggestions to enhance your entry content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button type="button" variant="outline" onClick={handleGetSuggestions} disabled={isSuggesting || !selectedCategory}>
                    {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Get Suggestions
                  </Button>
                  {aiError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{aiError}</AlertDescription>
                    </Alert>
                  )}
                  {aiSuggestions.length > 0 && (
                    <Alert variant="default" className="border-primary/50">
                      <Info className="h-4 w-4 text-primary" />
                      <AlertTitle className="text-primary">Suggestions Received</AlertTitle>
                      <AlertDescription>
                        <ScrollArea className="h-40 mt-2">
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {aiSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </ScrollArea>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchStatus === 'scheduled' && (
                  <FormField
                    control={form.control}
                    name="publishAt"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Publish Date & Time</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP HH:mm")
                                ) : (
                                  <span>Pick a date and time</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) } // Disable past dates
                              initialFocus
                            />
                            {/* Basic Time Picker - For a better UX, a dedicated time picker component would be ideal */}
                            <div className="p-2 border-t">
                                <Input 
                                    type="time" 
                                    defaultValue={field.value ? format(field.value, "HH:mm") : "09:00"}
                                    onChange={(e) => {
                                        const time = e.target.value;
                                        const [hours, minutes] = time.split(':').map(Number);
                                        const newDate = field.value ? new Date(field.value) : new Date();
                                        newDate.setHours(hours, minutes);
                                        field.onChange(newDate);
                                    }}
                                    className="w-full"
                                />
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-8 border-t mt-8">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => form.reset()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || !selectedCategory}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {initialData ? 'Save Changes' : 'Create Entry'}
          </Button>
        </div>
      </form>
    </Form>
  );
}


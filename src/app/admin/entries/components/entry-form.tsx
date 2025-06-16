
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UiCardDescription } from '@/components/ui/card'; // Renamed CardDescription to avoid conflict
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
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
import { addEntry, updateEntry } from '@/lib/actions/entryActions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface EntryFormProps {
  initialData?: Entry | null;
  categories: Category[]; // All categories for selection on new entry
  selectedCategory: Category; // The category for which the form is being built
  onSubmitSuccess?: () => void;
}

export function EntryForm({ initialData, categories, selectedCategory, onSubmitSuccess }: EntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Dynamic Zod schema generation based on selectedCategory.fields
  const generateSchema = useCallback((fields: FieldDefinition[] = []) => {
    const shape: Record<string, z.ZodTypeAny> = {
      title: z.string().min(1, "Entry Title is required."), // Top-level title field
      status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
      publishAt: z.date().optional().nullable(),
      // categoryId is handled separately, not part of this dynamic data schema
    };

    fields.forEach(field => {
      let fieldSchema: z.ZodTypeAny;
      switch (field.type) {
        case FieldType.TEXT:
        case FieldType.TEXTAREA:
          fieldSchema = z.string();
          break;
        case FieldType.NUMBER:
          fieldSchema = z.coerce.number();
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
      shape[`data.${field.key}`] = fieldSchema; // Use field.key for data object
    });
    return z.object(shape);
  }, []);

  const [currentSchema, setCurrentSchema] = useState(() => generateSchema(selectedCategory?.fields));

  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: initialData ? {
        title: initialData.title || '',
        status: initialData.status,
        publishAt: initialData.publishAt ? parseISO(initialData.publishAt) : undefined,
        data: initialData.data || {},
      } : {
        title: '',
        status: 'draft',
        publishAt: undefined,
        data: {},
      },
  });
  
   useEffect(() => {
    const newSchema = generateSchema(selectedCategory?.fields);
    setCurrentSchema(newSchema);
    
    const defaultData: Record<string, any> = {};
    selectedCategory?.fields.forEach(field => {
        const initialValue = initialData?.data?.[field.key];
        if (initialValue !== undefined) {
            if (field.type === FieldType.DATE && typeof initialValue === 'string') {
                defaultData[field.key] = parseISO(initialValue);
            } else {
                defaultData[field.key] = initialValue;
            }
        } else {
            if (field.type === FieldType.BOOLEAN) defaultData[field.key] = false;
            else if (field.type === FieldType.NUMBER) defaultData[field.key] = undefined; // Or 0 if preferred
            else defaultData[field.key] = ''; // Default for text/textarea
        }
    });

    form.reset({
      title: initialData?.title || '',
      status: initialData?.status || 'draft',
      publishAt: initialData?.publishAt ? parseISO(initialData.publishAt) : undefined,
      data: defaultData,
    }, {
      keepDirtyValues: false, 
      keepErrors: false, 
    });
  }, [selectedCategory, initialData, generateSchema, form]);


  const handleGetSuggestions = async () => {
    if (!selectedCategory) {
      setAiError("Please ensure a category is selected.");
      return;
    }
    const formData = form.getValues().data;
    let entryContent = form.getValues().title + "\n"; // Include main title

    // Attempt to find a primary content field or concatenate text fields
    const contentField = selectedCategory.fields.find(f => f.type === FieldType.TEXTAREA && (f.label.toLowerCase().includes('content') || f.label.toLowerCase().includes('body')));
    if (contentField && formData[contentField.key]) {
      entryContent += String(formData[contentField.key]);
    } else {
      selectedCategory.fields.forEach(field => {
        if ((field.type === FieldType.TEXT || field.type === FieldType.TEXTAREA) && formData[field.key]) {
          entryContent += `\n${field.label}: ${formData[field.key]}`;
        }
      });
    }

    if (!entryContent.trim()) {
      setAiError("Please provide some content (title or other fields).");
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

  const transformedSubmit = async (data: z.infer<typeof currentSchema>) => {
    setIsSubmitting(true);
    const submissionPayload = {
        title: data.title,
        categoryId: selectedCategory.id, // Add selectedCategoryId
        categoryName: selectedCategory.name, // Add selectedCategoryName
        status: data.status,
        publishAt: data.publishAt ? data.publishAt.toISOString() : null, // Ensure null if not set
        data: data.data,
    };

    let result;
    if (initialData?.id) {
        result = await updateEntry(initialData.id, submissionPayload);
    } else {
        result = await addEntry(submissionPayload);
    }
    setIsSubmitting(false);

    if (result && "id" in result && result.id) {
        toast({ title: "Success", description: `Entry ${initialData ? 'updated' : 'created'} successfully.`});
        if (onSubmitSuccess) onSubmitSuccess();
        else router.push(`/admin/entries?category=${selectedCategory.id}`); // Default redirect
         form.reset({ // Reset form to initial-like state for the current category
            title: '',
            status: 'draft',
            publishAt: undefined,
            data: Object.fromEntries(selectedCategory.fields.map(field => [field.key, field.type === FieldType.BOOLEAN ? false : '']))
        });
    } else if (result && "error" in result && result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(transformedSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Entry Details</CardTitle>
                <UiCardDescription>
                  Content for category: <span className="font-semibold text-primary">{selectedCategory.name}</span>
                </UiCardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <FormField
                    control={form.control}
                    name="title" // Top-level title
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Entry Title</FormLabel>
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
                    key={catField.id} // Use catField.id (unique client ID) for key in map
                    control={form.control}
                    name={`data.${catField.key}`} // Data stored under field's key
                    render={({ field: formHookField }) => ( // Renamed to avoid conflict
                      <FormItem>
                        <FormLabel>{catField.label}{catField.required && <span className="text-destructive">*</span>}</FormLabel>
                        {catField.description && <FormDescription>{catField.description}</FormDescription>}
                        <FormControl>
                          <>
                            {catField.type === FieldType.TEXT && <Input placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} {...formHookField} value={formHookField.value || ''} />}
                            {catField.type === FieldType.TEXTAREA && <Textarea placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} {...formHookField} value={formHookField.value || ''} rows={5} />}
                            {catField.type === FieldType.NUMBER && <Input type="number" placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} {...formHookField} value={formHookField.value || ''} onChange={e => formHookField.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}/>}
                            {catField.type === FieldType.BOOLEAN && (
                              <div className="flex items-center space-x-2 h-10">
                                <Checkbox id={`data.${catField.key}`} checked={formHookField.value} onCheckedChange={formHookField.onChange} />
                                <label htmlFor={`data.${catField.key}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                                      !formHookField.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formHookField.value ? format(formHookField.value instanceof Date ? formHookField.value : parseISO(formHookField.value as unknown as string), "PPP") : <span>{catField.placeholder || 'Pick a date'}</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={formHookField.value instanceof Date ? formHookField.value : (formHookField.value ? parseISO(formHookField.value as unknown as string) : undefined)}
                                    onSelect={formHookField.onChange}
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
                  <UiCardDescription>Get AI-powered suggestions to enhance your entry content.</UiCardDescription>
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
                              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) }
                              initialFocus
                            />
                            <div className="p-2 border-t">
                                <Input 
                                    type="time" 
                                    defaultValue={field.value ? format(field.value, "HH:mm") : "09:00"}
                                    onChange={(e) => {
                                        const time = e.target.value;
                                        const [hours, minutes] = time.split(':').map(Number);
                                        const newDate = field.value ? new Date(field.value) : new Date();
                                        if (!isNaN(hours) && !isNaN(minutes)) {
                                            newDate.setHours(hours, minutes);
                                            field.onChange(newDate);
                                        }
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
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => form.reset({
                title: initialData?.title || '',
                status: initialData?.status || 'draft',
                publishAt: initialData?.publishAt ? parseISO(initialData.publishAt) : undefined,
                data: initialData?.data ? 
                      Object.fromEntries(selectedCategory.fields.map(f => [f.key, initialData.data[f.key] || (f.type === FieldType.BOOLEAN ? false : '')])) 
                      : Object.fromEntries(selectedCategory.fields.map(f => [f.key, f.type === FieldType.BOOLEAN ? false : '']))
            })}>Cancel</Button>
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

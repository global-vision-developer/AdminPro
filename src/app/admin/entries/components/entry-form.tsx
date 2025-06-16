
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UiCardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Category, Entry, FieldDefinition } from '@/types';
import { FieldType } from '@/types';
import { CalendarIcon, Save, Loader2, Wand2, AlertTriangle, Info, MessageSquareText, Star } from 'lucide-react';
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
  categories: Category[];
  selectedCategory: Category;
  onSubmitSuccess?: () => void;
}

const USER_ONLY_FIELD_MARKER = "аппликейшний хэрэглэгчид бөглөнө";

export function EntryForm({ initialData, categories, selectedCategory, onSubmitSuccess }: EntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generateSchema = useCallback((fields: FieldDefinition[] = []) => {
    const shape: Record<string, z.ZodTypeAny> = {
      title: z.string().nonempty({ message: "Entry Title is required." }),
      status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
      publishAt: z.date().optional().nullable(),
    };

    fields.forEach(field => {
      if (field.description?.includes(USER_ONLY_FIELD_MARKER)) {
        shape[`data.${field.key}`] = z.any().optional().nullable();
        return;
      }

      let fieldSchema: z.ZodTypeAny;
      switch (field.type) {
        case FieldType.TEXT:
        case FieldType.TEXTAREA:
          if (field.required) {
            fieldSchema = z.string().nonempty({ message: `${field.label} талбарыг заавал бөглөнө үү.` });
          } else {
            fieldSchema = z.string().optional().nullable();
          }
          break;
        case FieldType.NUMBER:
          if (field.required) {
            fieldSchema = z.number({
              required_error: `${field.label} талбарыг заавал бөглөнө үү.`,
              invalid_type_error: `${field.label} тоон утга байх ёстой.`,
            });
          } else {
            fieldSchema = z.number({
              invalid_type_error: `${field.label} тоон утга байх ёстой.`,
            }).optional().nullable();
          }
          break;
        case FieldType.DATE:
          if (field.required) {
            fieldSchema = z.date({
              required_error: `${field.label} талбарыг заавал бөглөнө үү.`,
              invalid_type_error: `${field.label} зөв огноо байх ёстой.`,
            });
          } else {
            fieldSchema = z.date({
              invalid_type_error: `${field.label} зөв огноо байх ёстой.`,
            }).optional().nullable();
          }
          break;
        case FieldType.BOOLEAN:
          fieldSchema = z.boolean().default(false);
          break;
        default:
          fieldSchema = z.any();
      }
      shape[`data.${field.key}`] = fieldSchema;
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

    const defaultDataForReset: Record<string, any> = {};
    selectedCategory?.fields.forEach(field => {
        // Handle user-only fields (these won't be part of the form's controlled state for admin editing)
        if (field.description?.includes(USER_ONLY_FIELD_MARKER)) {
            if (initialData?.data?.[field.key] !== undefined) {
                 if (field.type === FieldType.DATE && typeof initialData.data[field.key] === 'string') {
                    // This data is for display only if it exists, not for form control
                } else {
                    // This data is for display only
                }
            }
            return; // Skip adding to form's controllable defaultData
        }

        const initialValueFromData = initialData?.data?.[field.key];

        if (initialValueFromData !== undefined) {
            if (field.type === FieldType.DATE && typeof initialValueFromData === 'string') {
                defaultDataForReset[field.key] = parseISO(initialValueFromData);
            } else {
                defaultDataForReset[field.key] = initialValueFromData;
            }
        } else { // Setting defaults for a new form or if field didn't exist in initialData
            if (field.type === FieldType.BOOLEAN) defaultDataForReset[field.key] = false;
            else if (field.type === FieldType.NUMBER) defaultDataForReset[field.key] = undefined; // Keep undefined for non-filled numbers
            else defaultDataForReset[field.key] = ''; // TEXT, TEXTAREA default to empty string
        }
    });

    form.reset({
      title: initialData?.title || '',
      status: initialData?.status || 'draft',
      publishAt: initialData?.publishAt ? parseISO(initialData.publishAt) : undefined,
      data: defaultDataForReset,
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
    let entryContent = form.getValues().title + "\n";

    const contentField = selectedCategory.fields.find(f => f.type === FieldType.TEXTAREA && (f.label.toLowerCase().includes('content') || f.label.toLowerCase().includes('body')));
    if (contentField && formData[contentField.key]) {
      entryContent += String(formData[contentField.key]);
    } else {
      selectedCategory.fields.forEach(field => {
        if (!field.description?.includes(USER_ONLY_FIELD_MARKER) && (field.type === FieldType.TEXT || field.type === FieldType.TEXTAREA) && formData[field.key]) {
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

  const transformedSubmit = async (formData: z.infer<typeof currentSchema>) => {
    setIsSubmitting(true);

    const adminEditableData: Record<string, any> = {};
    if (formData.data) {
      for (const key in formData.data) {
        const fieldDefinition = selectedCategory.fields.find(f => f.key === key);
        if (fieldDefinition && !fieldDefinition.description?.includes(USER_ONLY_FIELD_MARKER)) {
          if (fieldDefinition.type === FieldType.NUMBER && typeof formData.data[key] === 'string') {
            adminEditableData[key] = formData.data[key] === '' ? undefined : parseFloat(formData.data[key]);
          } else {
            adminEditableData[key] = formData.data[key];
          }
        }
      }
    }

    const submissionPayload = {
        title: formData.title,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        status: formData.status,
        publishAt: formData.status === 'scheduled' && formData.publishAt ? formData.publishAt.toISOString() : null,
        data: adminEditableData,
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
        else router.push(`/admin/entries?category=${selectedCategory.id}`);
        
        const resetData: Record<string, any> = {};
        selectedCategory.fields.filter(f => !f.description?.includes(USER_ONLY_FIELD_MARKER)).forEach(field => {
            if (field.type === FieldType.BOOLEAN) resetData[field.key] = false;
            else if (field.type === FieldType.NUMBER) resetData[field.key] = undefined;
            else resetData[field.key] = '';
        });
        form.reset({
            title: '',
            status: 'draft',
            publishAt: undefined,
            data: resetData
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
                    name="title"
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

                {selectedCategory?.fields.map(catField => {
                  const isUserOnlyField = catField.description?.includes(USER_ONLY_FIELD_MARKER);
                  const Icon = catField.key === 'unelgee' ? Star : catField.key === 'setgegdel' ? MessageSquareText : null;

                  if (isUserOnlyField) {
                    return (
                      <FormItem key={catField.id}>
                        <FormLabel className="flex items-center">
                          {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                          {catField.label}
                        </FormLabel>
                        {catField.description && <FormDescription>{catField.description}</FormDescription>}
                        <div className="p-3 mt-1 text-sm text-muted-foreground border rounded-md bg-muted/30 shadow-sm">
                          Энэ талбарт админ утга оруулахгүй. Аппликейшний хэрэглэгчид бөглөнө.
                           {initialData?.data?.[catField.key] && (
                            <span className="block mt-1 text-xs italic"> (Одоогийн утга: {String(initialData.data[catField.key])})</span>
                           )}
                        </div>
                      </FormItem>
                    );
                  }

                  return (
                    <FormField
                      key={catField.id}
                      control={form.control}
                      name={`data.${catField.key}`}
                      render={({ field: formHookField }) => (
                        <FormItem>
                          <FormLabel>{catField.label}{catField.required && <span className="text-destructive">*</span>}</FormLabel>
                          {catField.description && <FormDescription>{catField.description}</FormDescription>}
                          <FormControl>
                            <div>
                              {catField.type === FieldType.TEXT && <Input placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} {...formHookField} value={formHookField.value ?? ''} />}
                              {catField.type === FieldType.TEXTAREA && <Textarea placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} {...formHookField} value={formHookField.value ?? ''} rows={5} />}
                              {catField.type === FieldType.NUMBER && <Input type="number" placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} {...formHookField} value={formHookField.value === undefined || formHookField.value === null ? '' : String(formHookField.value)} onChange={e => formHookField.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}/>}
                              {catField.type === FieldType.BOOLEAN && (
                                <div className="flex items-center space-x-2 h-10">
                                  <Checkbox id={`data.${catField.key}`} checked={!!formHookField.value} onCheckedChange={formHookField.onChange} />
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
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}
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
                    rules={{
                        validate: value => {
                            if (!value) return "Publish date and time is required for scheduled entries.";
                            if (value < new Date(new Date().setHours(0,0,0,0))) return "Publish date cannot be in the past.";
                            return true;
                        }
                    }}
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
                              onSelect={(date) => {
                                if (date) {
                                  const currentTime = field.value ? new Date(field.value) : new Date();
                                  date.setHours(currentTime.getHours(), currentTime.getMinutes());
                                }
                                field.onChange(date);
                              }}
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
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => {
                const resetDataForCancel: Record<string, any> = {};
                selectedCategory.fields.filter(f => !f.description?.includes(USER_ONLY_FIELD_MARKER)).forEach(field => {
                    const initialVal = initialData?.data?.[field.key];
                    if (initialVal !== undefined) {
                         if (field.type === FieldType.DATE && typeof initialVal === 'string') resetDataForCancel[field.key] = parseISO(initialVal);
                         else resetDataForCancel[field.key] = initialVal;
                    } else {
                        if (field.type === FieldType.BOOLEAN) resetDataForCancel[field.key] = false;
                        else if (field.type === FieldType.NUMBER) resetDataForCancel[field.key] = undefined;
                        else resetDataForCancel[field.key] = '';
                    }
                });
                form.reset({
                    title: initialData?.title || '',
                    status: initialData?.status || 'draft',
                    publishAt: initialData?.publishAt ? parseISO(initialData.publishAt) : undefined,
                    data: resetDataForCancel
                });
            }
          }>Cancel</Button>
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
    

    
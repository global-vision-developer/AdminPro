
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  categories: Category[]; // All available categories (might not be needed if selectedCategory is always robust)
  selectedCategory: Category; // The currently selected category object
  onSubmitSuccess?: () => void;
}

const USER_ONLY_FIELD_MARKER = "аппликейшний хэрэглэгчид бөглөнө";

// Moved generateSchema outside the component to be a pure function
const generateSchema = (fields: FieldDefinition[] = []): z.ZodObject<any, any, any> => {
  const shape: Record<string, z.ZodTypeAny> = {
    title: z.string().trim().min(1, { message: "Бичлэгийн гарчгийг заавал бөглөнө үү." }),
    status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
    publishAt: z.date().optional().nullable(),
    // Initialize data as an object schema. Specific fields will be added based on category.
    data: z.object({}).passthrough(), // Use passthrough to allow any fields initially
  };

  const dataShape: Record<string, z.ZodTypeAny> = {};
  fields.forEach(field => {
    if (field.description?.includes(USER_ONLY_FIELD_MARKER)) {
      dataShape[field.key] = z.any().optional().nullable();
      return;
    }

    let fieldSchema: z.ZodTypeAny;
    switch (field.type) {
      case FieldType.TEXT:
      case FieldType.TEXTAREA:
        if (field.required) {
          fieldSchema = z.string().trim().min(1, { message: `${field.label} талбарыг заавал бөглөнө үү.` });
        } else {
          // Allow empty string, but treat null/undefined as empty string for form binding
          fieldSchema = z.string().optional().nullable().transform(val => val ?? '');
        }
        break;
      case FieldType.NUMBER:
        const baseNumberPreprocessor = (val: unknown) => (val === "" || val === undefined || val === null) ? undefined : String(val);
        const numberValidation = z.string()
          .refine((val) => val === undefined || val === null || val === '' || !isNaN(parseFloat(val)), { message: `${field.label} тоон утга байх ёстой.` })
          .transform(val => (val === undefined || val === null || val === '') ? null : Number(val));

        if (field.required) {
          fieldSchema = z.preprocess(baseNumberPreprocessor, z.string().nonempty({ message: `${field.label} талбарыг заавал бөглөнө үү.` }).pipe(numberValidation));
        } else {
          fieldSchema = z.preprocess(baseNumberPreprocessor, z.string().optional().nullable().pipe(numberValidation.optional().nullable()));
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
        fieldSchema = z.any().optional().nullable();
    }
    dataShape[field.key] = fieldSchema;
  });
  
  shape.data = z.object(dataShape);

  return z.object(shape).refine(data => {
    if (data.status === 'scheduled' && !data.publishAt) {
      return false;
    }
    return true;
  }, {
    message: "Нийтлэх огноо, цагийг сонгоно уу.",
    path: ["publishAt"],
  });
};


export function EntryForm({ initialData, categories, selectedCategory, onSubmitSuccess }: EntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const formSchema = useMemo(() => generateSchema(selectedCategory?.fields), [selectedCategory]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange', 
    defaultValues: () => {
        const defaultDataValues: Record<string, any> = {};
        selectedCategory?.fields?.forEach(field => {
            if (field.description?.includes(USER_ONLY_FIELD_MARKER)) {
                if (initialData?.data && initialData.data.hasOwnProperty(field.key)) {
                     defaultDataValues[field.key] = initialData.data[field.key];
                } else {
                     defaultDataValues[field.key] = undefined; 
                }
                return;
            }
    
            const initialValueFromData = initialData?.data?.[field.key];
    
            if (initialValueFromData !== undefined && initialValueFromData !== null) {
                if (field.type === FieldType.DATE && typeof initialValueFromData === 'string') {
                    try { defaultDataValues[field.key] = parseISO(initialValueFromData); } catch (e) { defaultDataValues[field.key] = undefined; }
                } else if (field.type === FieldType.NUMBER) {
                     defaultDataValues[field.key] = (initialValueFromData === '' || initialValueFromData === null || initialValueFromData === undefined) ? undefined : initialValueFromData;
                } else {
                    defaultDataValues[field.key] = initialValueFromData;
                }
            } else { 
                if (field.type === FieldType.BOOLEAN) defaultDataValues[field.key] = false;
                else if (field.type === FieldType.NUMBER) defaultDataValues[field.key] = undefined; 
                else if (field.type === FieldType.DATE) defaultDataValues[field.key] = undefined;
                else defaultDataValues[field.key] = ''; // TEXT, TEXTAREA
            }
        });
        
        return {
            title: initialData?.title || '',
            status: initialData?.status || 'draft',
            publishAt: initialData?.publishAt ? parseISO(initialData.publishAt) : null, // Ensure null for empty dates
            data: defaultDataValues,
        };
    }
  });
  
  // This useEffect will re-run when selectedCategory changes, which might trigger a form value reset
  // if `defaultValues` in `useForm` is not a function or not memoized correctly with selectedCategory.
  // Since defaultValues is now a function, this explicit reset might be redundant IF the component is re-keyed.
  // If the component is NOT re-keyed, this explicit reset is necessary.
  // Let's keep it for now if re-keying is only on NewEntryPage.
   useEffect(() => {
    form.reset(form.formState.defaultValues); // Reset to the values derived from the defaultValues function
  }, [selectedCategory, initialData, form]);


  const handleGetSuggestions = async () => {
    if (!selectedCategory) {
      setAiError("Please ensure a category is selected.");
      return;
    }
    const formDataValues = form.getValues(); 
    let entryContent = formDataValues.title + "\n";

    const contentField = selectedCategory.fields.find(f => f.type === FieldType.TEXTAREA && (f.label.toLowerCase().includes('content') || f.label.toLowerCase().includes('body')));
    if (contentField && formDataValues.data && formDataValues.data[contentField.key]) {
      entryContent += String(formDataValues.data[contentField.key]);
    } else if (formDataValues.data) {
      selectedCategory.fields.forEach(field => {
        if (!field.description?.includes(USER_ONLY_FIELD_MARKER) && (field.type === FieldType.TEXT || field.type === FieldType.TEXTAREA) && formDataValues.data[field.key]) {
          entryContent += `\n${field.label}: ${formDataValues.data[field.key]}`;
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

  const transformedSubmit = async (formDataFromHook: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    const adminEditableData: Record<string, any> = {};
    selectedCategory.fields.forEach(field => {
      if (field.description?.includes(USER_ONLY_FIELD_MARKER)) {
        if (initialData?.data && initialData.data.hasOwnProperty(field.key)) {
             adminEditableData[field.key] = initialData.data[field.key];
        } else {
            adminEditableData[field.key] = null; // Or undefined, depending on desired Firestore behavior
        }
        return; 
      }

      const key = field.key;
      const valueFromForm = formDataFromHook.data ? formDataFromHook.data[key] : undefined;
      let valueToSave: any;
      
      switch (field.type) {
        case FieldType.NUMBER:
          if (typeof valueFromForm === 'number') {
            valueToSave = valueFromForm;
          } else { 
            valueToSave = null; // Store null if not a valid number or empty
          }
          break;
        case FieldType.DATE:
          if (valueFromForm instanceof Date) {
            valueToSave = valueFromForm.toISOString();
          } else {
            valueToSave = null; 
          }
          break;
        case FieldType.BOOLEAN:
          valueToSave = !!valueFromForm; 
          break;
        case FieldType.TEXT:
        case FieldType.TEXTAREA:
          // Ensure empty strings are saved, not null/undefined, if that's the intent.
          // Zod transform already makes it '' if null/undefined.
          valueToSave = (typeof valueFromForm === 'string') ? valueFromForm : '';
          break;
        default:
          valueToSave = valueFromForm; // For any other types or 'any'
      }
      adminEditableData[key] = valueToSave;
    });

    const submissionPayload = {
        title: formDataFromHook.title,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        status: formDataFromHook.status,
        publishAt: formDataFromHook.status === 'scheduled' && formDataFromHook.publishAt ? formDataFromHook.publishAt.toISOString() : null,
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
        
        // Reset form to its default state after successful submission (for new entries)
        if(!initialData) {
            form.reset(form.formState.defaultValues);
        }

    } else if (result && "error" in result && result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleCancel = () => {
    // Reset form to its default state (initial or empty)
    form.reset(form.formState.defaultValues);
    router.back();
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
                           {initialData?.data?.[catField.key] !== undefined && initialData?.data?.[catField.key] !== null && (
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
                            <>
                              {catField.type === FieldType.TEXT && (
                                <Input 
                                  placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} 
                                  {...formHookField}
                                />
                              )}
                              {catField.type === FieldType.TEXTAREA && (
                                <Textarea 
                                  placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} 
                                  {...formHookField}
                                  rows={5}
                                />
                              )}
                              {catField.type === FieldType.NUMBER && (
                                <Input 
                                  type="text" // Use text to allow empty input initially, Zod handles conversion/validation
                                  inputMode="numeric" 
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`} 
                                  {...formHookField} 
                                  // RHF handles value conversion based on schema and registration
                                  // Ensure value is string for input, or empty string
                                  value={formHookField.value === undefined || formHookField.value === null ? '' : String(formHookField.value)}
                                  onChange={e => {
                                    const val = e.target.value;
                                    // Pass string to RHF, Zod preprocessor will handle it
                                    formHookField.onChange(val === '' ? undefined : val);
                                  }}
                                />
                              )}
                              {catField.type === FieldType.BOOLEAN && (
                                <div className="flex items-center space-x-2 h-10">
                                  <Checkbox 
                                    id={`data.${catField.key}`}
                                    {...formHookField}
                                    checked={!!formHookField.value} 
                                    onCheckedChange={formHookField.onChange}
                                  />
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
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || !selectedCategory || !selectedCategory.fields?.length}>
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

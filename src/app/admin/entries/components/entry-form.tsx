"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UiCardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription, useFormField } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Category, Entry, FieldDefinition, ImageGalleryItemForm, ImageGalleryItemStored, City } from '@/types'; // Added City
import { FieldType } from '@/types';
import { CalendarIcon, Save, Loader2, Wand2, AlertTriangle, Info, MessageSquareText, Star, PlusCircle, Trash2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { suggestContent } from '@/ai/flows/suggest-content-on-schedule';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addEntry, updateEntry } from '@/lib/actions/entryActions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import ImageUploader from '@/components/admin/image-uploader';
import { useAuth } from '@/hooks/use-auth';

interface EntryFormProps {
  initialData?: Entry | null;
  categories: Category[];
  selectedCategory: Category;
  cities: City[];
  onSubmitSuccess?: () => void;
  sourceAnketId?: string;
}

const USER_ONLY_FIELD_MARKER = "This field is for app users, not admins.";
const EMPTY_CITY_PICKER_VALUE = "_EMPTY_"; // Sentinel value for "no selection"

const generateSchema = (fields: FieldDefinition[] = []): z.ZodObject<any, any, any> => {
  const shape: Record<string, z.ZodTypeAny> = {
    title: z.string().trim().min(1, { message: "Entry title is required." }),
    status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
    publishAt: z.date().optional().nullable(),
    data: z.object({}).passthrough(),
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
        if (field.required) {
          fieldSchema = z.string().trim().min(1, { message: `${field.label} field is required.` });
        } else {
          fieldSchema = z.string().optional().nullable().transform(val => val ?? '');
        }
        break;
      case FieldType.TEXTAREA:
        if (field.required) {
          fieldSchema = z.string().trim().min(1, { message: `${field.label} field is required.` });
        } else {
          fieldSchema = z.string().optional().nullable().transform(val => val ?? '');
        }
        break;
      case FieldType.IMAGE:
        if (field.required) {
            fieldSchema = z.string().min(1, { message: `${field.label} is required.` });
        } else {
            fieldSchema = z.string().nullable().optional();
        }
        break;
      case FieldType.NUMBER:
        const baseNumberPreprocessor = (val: unknown) => (val === "" || val === undefined || val === null) ? undefined : String(val);
        const numberValidation = z.string()
          .refine((val) => val === undefined || val === null || val === '' || !isNaN(parseFloat(val)), { message: `${field.label} must be a number.` })
          .transform(val => (val === undefined || val === null || val === '') ? null : Number(val));

        if (field.required) {
          fieldSchema = z.preprocess(baseNumberPreprocessor, z.string().nonempty({ message: `${field.label} field is required.` }).pipe(numberValidation));
        } else {
          fieldSchema = z.preprocess(baseNumberPreprocessor, z.string().optional().nullable().pipe(numberValidation.optional().nullable()));
        }
        break;
      case FieldType.DATE:
        if (field.required) {
          fieldSchema = z.date({
            required_error: `${field.label} field is required.`,
            invalid_type_error: `${field.label} must be a valid date.`,
          });
        } else {
          fieldSchema = z.date({
            invalid_type_error: `${field.label} must be a valid date.`,
          }).optional().nullable();
        }
        break;
      case FieldType.BOOLEAN:
        fieldSchema = z.boolean().default(false);
        break;
      case FieldType.IMAGE_GALLERY:
        const imageGalleryItemSchema = z.object({
            clientId: z.string(),
            imageUrl: z.string().nullable().optional(),
            description: z.string().optional().transform(val => val === '' ? undefined : val),
        });

        if (field.required) {
            fieldSchema = z.array(imageGalleryItemSchema)
                .min(1, { message: `${field.label}: At least one image is required.` })
                .refine(items => items.some(item => item.imageUrl !== null && item.imageUrl !== ''), {
                    message: `${field.label}: At least one image URL/Data is required.`,
                });
        } else {
            fieldSchema = z.array(imageGalleryItemSchema).optional().default([]);
        }
        break;
      case FieldType.CITY_PICKER: 
        if (field.required) {
          fieldSchema = z.string().min(1, { message: `${field.label} is required.` });
        } else {
          fieldSchema = z.string().optional().nullable();
        }
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
    message: "Please select a publish date and time for scheduled entries.",
    path: ["publishAt"],
  });
};


export function EntryForm({ initialData, categories, selectedCategory, cities, onSubmitSuccess, sourceAnketId }: EntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const formSchema = useMemo(() => generateSchema(selectedCategory?.fields), [selectedCategory]);

  const getComputedDefaultValues = useCallback(() => {
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
            } else if (field.type === FieldType.IMAGE_GALLERY) {
                defaultDataValues[field.key] = Array.isArray(initialValueFromData)
                    ? initialValueFromData.map((item: ImageGalleryItemStored) => ({ ...item, clientId: uuidv4(), imageUrl: item.imageUrl || null }))
                    : [];
            } else if (field.type === FieldType.CITY_PICKER) {
                defaultDataValues[field.key] = initialValueFromData || undefined;
            } else {
                defaultDataValues[field.key] = initialValueFromData;
            }
        } else {
            if (field.type === FieldType.BOOLEAN) defaultDataValues[field.key] = false;
            else if (field.type === FieldType.NUMBER) defaultDataValues[field.key] = undefined;
            else if (field.type === FieldType.DATE) defaultDataValues[field.key] = undefined;
            else if (field.type === FieldType.IMAGE_GALLERY) defaultDataValues[field.key] = [];
            else if (field.type === FieldType.IMAGE) defaultDataValues[field.key] = null;
            else if (field.type === FieldType.CITY_PICKER) defaultDataValues[field.key] = undefined; 
            else defaultDataValues[field.key] = '';
        }
    });

    let publishAtDate: Date | null = null;
    if (initialData?.publishAt) {
        try {
            if (typeof initialData.publishAt === 'string' && initialData.publishAt.trim() !== '') {
                publishAtDate = parseISO(initialData.publishAt);
            } else if (initialData.publishAt instanceof Date) {
                publishAtDate = initialData.publishAt;
            }
        } catch (e) {
            console.error("Error parsing initialData.publishAt in EntryForm defaultValues:", initialData.publishAt, e);
        }
    }

    return {
        title: initialData?.title || '',
        status: initialData?.status || 'draft',
        publishAt: publishAtDate,
        data: defaultDataValues,
    };
  }, [initialData, selectedCategory]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: getComputedDefaultValues(),
  });

  useEffect(() => {
    form.reset(getComputedDefaultValues());
  }, [selectedCategory, initialData, form, getComputedDefaultValues]);


  const handleGetSuggestions = async () => {
    if (!selectedCategory) {
      setAiError("Category not selected.");
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
            adminEditableData[field.key] = null;
        }
        return;
      }

      const key = field.key;
      const valueFromForm = formDataFromHook.data ? formDataFromHook.data[key] : undefined;
      let valueToSave: any;

      switch (field.type) {
        case FieldType.NUMBER:
          valueToSave = (typeof valueFromForm === 'number') ? valueFromForm : null;
          break;
        case FieldType.DATE:
          valueToSave = (valueFromForm instanceof Date) ? valueFromForm.toISOString() : null;
          break;
        case FieldType.BOOLEAN:
          valueToSave = !!valueFromForm;
          break;
        case FieldType.TEXT:
        case FieldType.TEXTAREA:
        case FieldType.CITY_PICKER: 
          valueToSave = (typeof valueFromForm === 'string') ? valueFromForm : (valueFromForm === null ? null : '');
          break;
        case FieldType.IMAGE:
          valueToSave = typeof valueFromForm === 'string' && valueFromForm ? valueFromForm : null;
          break;
        case FieldType.IMAGE_GALLERY:
          valueToSave = Array.isArray(valueFromForm)
            ? valueFromForm.filter(item => item.imageUrl !== null && item.imageUrl !== '').map((item: ImageGalleryItemForm) => ({
                imageUrl: item.imageUrl as string,
                description: item.description,
              }))
            : [];
          break;
        default:
          valueToSave = valueFromForm;
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
    const adminId = currentUser?.id;

    if (initialData?.id) {
        result = await updateEntry(initialData.id, submissionPayload);
    } else {
        if (!adminId && sourceAnketId) {
            toast({ title: "Error", description: "Admin user not authenticated. Cannot process anket approval.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        result = await addEntry(submissionPayload, sourceAnketId, adminId);
    }
    setIsSubmitting(false);

    if (result && "id" in result && result.id) {
        toast({ title: "Success", description: `Entry ${initialData || sourceAnketId ? 'updated/created' : 'created'}.`});
        if (onSubmitSuccess) onSubmitSuccess();
        else router.push(`/admin/entries?category=${selectedCategory.id}`);

        if(!initialData) {
           form.reset(getComputedDefaultValues());
        }

    } else if (result && "error" in result && result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleCancel = () => {
    form.reset(getComputedDefaultValues());
    router.back();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(transformedSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Бүртгэлийн дэлгэрэнгүй</CardTitle>
                <UiCardDescription>
                  Контент: <span className="font-semibold text-primary">{selectedCategory.name}</span>
                </UiCardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Гарчиг</FormLabel>
                        <FormControl>
                            <Input placeholder="Энэ бүртгэлийн гарчгийг оруулна уу" {...field} />
                        </FormControl>
                        <FormDescription>гарчиг нь жагсаалт болон товч мэдээлэлд харагдана.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                 />

                {selectedCategory?.fields.map(catField => {
                  const isUserOnlyField = catField.description?.includes(USER_ONLY_FIELD_MARKER);
                  const Icon = catField.key === 'rating' ? Star : catField.key === 'comment' ? MessageSquareText : null;
                  
                  if (isUserOnlyField) {
                    return (
                      <FormItem key={catField.id}>
                        <FormLabel className="flex items-center">
                          {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                          {catField.label}
                        </FormLabel>
                        {catField.description && <FormDescription>{catField.description}</FormDescription>}
                        <div className="p-3 mt-1 text-sm text-muted-foreground border rounded-md bg-muted/30 shadow-sm">
                          This field is not editable by admins. It is populated by application users.
                           {initialData?.data?.[catField.key] !== undefined && initialData?.data?.[catField.key] !== null && (
                            <span className="block mt-1 text-xs italic"> (Current value: {String(initialData.data[catField.key])})</span>
                           )}
                        </div>
                      </FormItem>
                    );
                  }

                  if (catField.type === FieldType.IMAGE) {
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
                                        <ImageUploader
                                            initialImageUrl={formHookField.value}
                                            onUploadComplete={(url) => formHookField.onChange(url)}
                                            storagePath="entries/"
                                            label={catField.label}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                     );
                  }

                  if (catField.type === FieldType.IMAGE_GALLERY) {
                    const { fields: galleryFields, append, remove, update: updateGalleryItem } = useFieldArray({
                      control: form.control,
                      name: `data.${catField.key}` as any,
                      keyName: "clientId",
                    });

                    return (
                      <FormItem key={catField.id}>
                        <FormLabel>{catField.label === 'golheseg' ? 'аппын эхний нүүр хэсэг(home page) дээр preview гаргах эсэх' : catField.label}{catField.required && <span className="text-destructive">*</span>}</FormLabel>
                        {catField.description && <FormDescription>{catField.description}</FormDescription>}
                        <div className="space-y-4 p-4 border rounded-md">
                          {galleryFields.map((item, index) => (
                            <Card key={item.clientId} className="p-3 bg-muted/50">
                              <div className="space-y-3">
                                <Controller
                                  control={form.control}
                                  name={`data.${catField.key}.${index}.imageUrl` as const}
                                  render={({ field: galleryItemField }) => (
                                    <ImageUploader
                                      initialImageUrl={galleryItemField.value}
                                      onUploadComplete={(url) => {
                                        const currentItem = form.getValues(`data.${catField.key}`)[index];
                                        updateGalleryItem(index, { ...currentItem, imageUrl: url });
                                      }}
                                      storagePath="entries/"
                                      label="Image"
                                    />
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`data.${catField.key}.${index}.description` as const}
                                  render={({ field: galleryItemField }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Description (Optional)</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Image description" {...galleryItemField} rows={2} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="mt-2 text-destructive hover:text-destructive/90"
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" /> Устгах
                              </Button>
                            </Card>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ clientId: uuidv4(), imageUrl: null, description: '' })}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" /> Зураг нэмэх
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }

                  if (catField.type === FieldType.CITY_PICKER) {
                    return (
                      <FormField
                        key={catField.id}
                        control={form.control}
                        name={`data.${catField.key}`}
                        render={({ field: formHookField }) => (
                          <FormItem>
                            <FormLabel>{catField.label}{catField.required && <span className="text-destructive">*</span>}</FormLabel>
                            {catField.description && <FormDescription>{catField.description}</FormDescription>}
                            <Select
                              onValueChange={(value) => formHookField.onChange(value === EMPTY_CITY_PICKER_VALUE ? null : value)}
                              value={formHookField.value ?? EMPTY_CITY_PICKER_VALUE}
                              disabled={cities.length === 0 && !catField.required}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={catField.placeholder || `Select ${catField.label.toLowerCase()}`} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={EMPTY_CITY_PICKER_VALUE}>-- Хоосон --</SelectItem>
                                {cities.map((city) => (
                                  <SelectItem key={city.id} value={city.id}>
                                    {city.name} ({city.nameCN})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {cities.length === 0 && (
                              <FormDescription className="text-orange-600">
                                Хотын жагсаалт хоосон байна. Эхлээд "Хотууд" хэсэгт хот нэмнэ үү.
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    );
                  }

                  return (
                    <FormField
                      key={catField.id}
                      control={form.control}
                      name={`data.${catField.key}`}
                      render={({ field: formHookField }) => {
                        const { formItemId } = useFormField();
                        return (
                            <FormItem>
                            <FormLabel>{catField.label === 'golheseg' ? 'аппын эхний нүүр хэсэг(home page) дээр preview гаргах эсэх' : catField.label}{catField.required && <span className="text-destructive">*</span>}</FormLabel>
                            {catField.description && <FormDescription>{catField.description}</FormDescription>}

                            {catField.type === FieldType.TEXT && (
                                <FormControl>
                                <Input
                                    placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`}
                                    {...formHookField}
                                    value={formHookField.value === null ? '' : formHookField.value}
                                />
                                </FormControl>
                            )}
                            {catField.type === FieldType.TEXTAREA && (
                                <FormControl>
                                <Textarea
                                    placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`}
                                    {...formHookField}
                                    rows={5}
                                />
                                </FormControl>
                            )}
                            {catField.type === FieldType.NUMBER && (
                                <FormControl>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*\.?[0-9]*"
                                    placeholder={catField.placeholder || `Enter ${catField.label.toLowerCase()}`}
                                    {...formHookField}
                                    value={formHookField.value === undefined || formHookField.value === null ? '' : String(formHookField.value)}
                                    onChange={e => {
                                    const val = e.target.value;
                                    formHookField.onChange(val === '' ? undefined : val);
                                    }}
                                />
                                </FormControl>
                            )}
                            {catField.type === FieldType.BOOLEAN && (
                                 <div className="flex items-center space-x-2 h-10 pt-2.5">
                                    <FormControl>
                                        <Checkbox
                                        {...formHookField}
                                        checked={!!formHookField.value}
                                        onCheckedChange={formHookField.onChange}
                                        id={formItemId}
                                        />
                                    </FormControl>
                                    <label
                                        htmlFor={formItemId}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {catField.placeholder || 'Enable'}
                                    </label>
                                </div>
                            )}
                            {catField.type === FieldType.DATE && (
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
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
                                    </FormControl>
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
                            <FormMessage />
                            </FormItem>
                        );
                      }}
                    />
                  );
                })}
              </CardContent>
            </Card>

             {selectedCategory && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center"><Wand2 className="mr-2 h-5 w-5 text-primary"/>Хиймэл оюуны(AI) контентын санал</CardTitle>
                  <UiCardDescription>Контентоо сайжруулах AI-ийн санал</UiCardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button type="button" variant="outline" onClick={handleGetSuggestions} disabled={isSuggesting || !selectedCategory}>
                    {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Надад санал болго
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
                <CardTitle className="font-headline">Нийтлэх</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Төлөв</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Ноорог</SelectItem>
                          <SelectItem value="published">Нийтлэгдсэн</SelectItem>
                          <SelectItem value="scheduled">Товлогдсон</SelectItem>
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
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancel}>Цуцлах</Button>
          <Button type="submit" disabled={isSubmitting || !selectedCategory || !selectedCategory.fields?.length}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {initialData ? 'Өөрчлөлтийг хадгалах' : 'Бүртгэл үүсгэх'}
          </Button>
        </div>
      </form>
    </Form>
  );
}


"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UiCardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import type { Category, FieldDefinition } from '@/types';
import { FieldType } from '@/types';
import { PlusCircle, Trash2, Save, Loader2, XCircle, Edit3 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/admin/image-uploader'; // Import ImageUploader

const fieldDefinitionClientSchema = z.object({
  id: z.string().default(() => uuidv4()),
  label: z.string().min(1, "Field label is required."),
  key: z.string().min(1, "Field key is required (auto-generated from label).").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Key must contain only lowercase letters, numbers, and hyphens."),
  type: z.nativeEnum(FieldType),
  required: z.boolean().default(false),
  placeholder: z.string().transform(val => val === '' ? undefined : val).optional(),
  description: z.string().transform(val => val === '' ? undefined : val).optional(),
});

const categoryFormSchema = z.object({
  name: z.string(),
  slug: z.string().min(1, "Slug is required.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens."),
  description: z.string().optional().default(''),
  coverImageUrl: z.string().url("Invalid cover image URL.").nullable().optional(), // Added for cover image
  fields: z.array(fieldDefinitionClientSchema).min(0, "You can save a category without fields initially."),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
type FieldFormValues = z.infer<typeof fieldDefinitionClientSchema>;

interface CategoryFormProps {
  initialData?: Category | null;
  onSubmit: (data: CategoryFormValues) => Promise<{id?: string; error?: string} | {success?: boolean; error?: string } | void>;
  isSubmittingGlobal: boolean;
  onFormSuccess?: () => void;
}

export function CategoryForm({ initialData, onSubmit, isSubmittingGlobal, onFormSuccess }: CategoryFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isFieldFormOpen, setIsFieldFormOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  const defaultFieldsForNewCategory: FieldDefinition[] = [
      {
        id: uuidv4(),
        label: 'Name',
        key: 'name',
        type: FieldType.TEXT,
        required: true,
        placeholder: 'Entry title or name',
        description: 'The main title or name for this entry.'
      },
      {
        id: uuidv4(),
        label: 'City',
        key: 'city',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., Ulaanbaatar',
        description: 'The city related to the entry.'
      },
      {
        id: uuidv4(),
        label: 'Rating',
        key: 'rating',
        type: FieldType.NUMBER,
        required: false,
        placeholder: 'e.g., 1-5',
        description: 'User rating (number). This field is for app users, not admins.'
      },
      {
        id: uuidv4(),
        label: 'Comment',
        key: 'comment',
        type: FieldType.TEXTAREA,
        required: false,
        placeholder: 'Write user comment here.',
        description: 'Comments left by users. This field is for app users, not admins.'
      }
  ];

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    mode: 'onChange', 
    defaultValues: initialData ? {
      name: initialData.name,
      slug: initialData.slug,
      description: initialData.description || '',
      coverImageUrl: initialData.coverImageUrl || null, // Initialize coverImageUrl
      fields: initialData.fields.map(f => ({ ...f, id: f.id || uuidv4(), key: f.key || slugify(f.label) }))
    } : {
      name: '',
      slug: '',
      description: '',
      coverImageUrl: null, // Default coverImageUrl
      fields: defaultFieldsForNewCategory,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "fields",
    keyName: "fieldFormId", 
  });

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value;
    form.setValue('name', newName);
    if (!form.formState.dirtyFields.slug || !form.getValues('slug')) {
      form.setValue('slug', slugify(newName));
    }
  };
  
  const handleSaveField = (fieldData: FieldFormValues) => {
    const finalFieldData = { ...fieldData, key: slugify(fieldData.label) };

    const otherFields = fields.filter((_, idx) => idx !== editingFieldIndex);
    if (otherFields.some(f => f.key === finalFieldData.key)) {
      toast({
        title: "Error: Duplicate Field Key",
        description: `The key "${finalFieldData.key}" generated from field label "${finalFieldData.label}" already exists in this category. Please use a different label.`,
        variant: "destructive",
      });
      fieldFormMethods.setError("label", {type: "manual", message: "This label generates a duplicate key."})
      return; 
    }

    if (editingFieldIndex !== null) {
      update(editingFieldIndex, finalFieldData);
    } else {
      append(finalFieldData);
    }
    setIsFieldFormOpen(false);
    setEditingFieldIndex(null);
  };

  const openFieldForm = (index?: number) => {
    if (index !== undefined && fields[index]) {
      setEditingFieldIndex(index);
    } else {
      setEditingFieldIndex(null);
    }
    setIsFieldFormOpen(true);
  };

  const handleFormSubmit = async (data: CategoryFormValues) => {
    if (data.name.trim() === "") {
        form.setError("name", { type: "manual", message: "Category name cannot be empty." });
        toast({
            title: "Validation Error",
            description: "Category name is required and cannot be empty.",
            variant: "destructive",
        });
        return;
    }

    const fieldKeys = new Set<string>();
    for (const f of data.fields) {
      if (fieldKeys.has(f.key)) {
        toast({
          title: "Error: Duplicate Field Keys",
          description: `The key "${f.key}" generated from field label "${f.label}" is duplicated. Please ensure all field labels generate unique keys.`,
          variant: "destructive",
        });
        return;
      }
      fieldKeys.add(f.key);
    }

    const result = await onSubmit(data);

    if (result && "error" in result && result.error) {
      toast({
        title: "Operation Failed",
        description: result.error,
        variant: "destructive",
      });
    } else if (result && (("id" in result && result.id) || ("success" in result && result.success))) {
       toast({
        title: "Success",
        description: `Category ${initialData ? "updated" : "created"}.`,
      });
      if (onFormSuccess) onFormSuccess();
      form.reset(initialData ? { 
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description || '',
        coverImageUrl: initialData.coverImageUrl || null,
        fields: initialData.fields.map(f => ({ ...f, id: f.id || uuidv4(), key: f.key || slugify(f.label) }))
      } : {
        name: '',
        slug: '',
        description: '',
        coverImageUrl: null,
        fields: defaultFieldsForNewCategory, 
      }); 
    }
  };
  
  const fieldFormMethods = useForm<FieldFormValues>({
    resolver: zodResolver(fieldDefinitionClientSchema),
    mode: 'onChange', 
  });

  useEffect(() => {
    if (isFieldFormOpen) {
      if (editingFieldIndex !== null && fields[editingFieldIndex]) {
        fieldFormMethods.reset(fields[editingFieldIndex]);
      } else {
        fieldFormMethods.reset({
          id: uuidv4(),
          label: '',
          key: '',
          type: FieldType.TEXT, 
          required: false,
          placeholder: undefined,
          description: undefined,
        });
      }
    }
  }, [isFieldFormOpen, editingFieldIndex, fields, fieldFormMethods]);


  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Ангиллын дэлгэрэнгүй</CardTitle>
              <UiCardDescription>Энэ ангиллын нэр, slug, тайлбарыг үүсгэнэ үү.</UiCardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Blog Posts, Products" {...field} onChange={handleNameChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Товчлол (URL Identifier)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., blog-posts, product-info" {...field} />
                    </FormControl>
                    <FormDescription>Давтагдашгүй, жижиг үсгээр, зөвхөн үсэг, тоо, зураас (-) агуулна.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тайлбар (Заавал биш)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A brief description of what this category is for." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ангиллын нүүр зураг</FormLabel>
                    <FormControl>
                       <ImageUploader
                        initialImageUrl={field.value}
                        onUploadComplete={(url) => field.onChange(url)}
                        storagePath="category-covers"
                        label="Ангиллын нүүр зураг"
                      />
                    </FormControl>
                    <FormDescription>Энэ ангиллын нүүр зургийг байршуулна уу.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Талбарын тодорхойлолт</CardTitle>
              <UiCardDescription>Энэ ангилалд хамаарах бүртгэлийн өгөгдлийн бүтцийг тодорхойлно уу.</UiCardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Талбар тодорхойлоогүй байна. Эхлэхийн тулд "Шинэ талбар нэмэх" дээр дарна уу.
                </p>
              )}
              <ScrollArea className={fields.length > 3 ? "h-72" : ""}>
                <div className="space-y-3 pr-3">
                  {fields.map((fieldItem, index) => (
                    <div key={fieldItem.fieldFormId} className="flex items-center justify-between p-3 border rounded-md bg-background shadow-sm hover:shadow-md transition-shadow">
                      <div>
                        <p className="font-medium text-foreground">{fieldItem.label}</p>
                        <p className="text-xs text-muted-foreground">Төрөл: {fieldItem.type} | Түлхүүр: <span className="font-mono bg-muted px-1 rounded">{fieldItem.key}</span> {fieldItem.required && <span className="text-destructive font-semibold">(заавал)</span>}</p>
                        {fieldItem.description && <p className="text-xs text-muted-foreground mt-1">Тайлбар: {fieldItem.description.substring(0,50)}{fieldItem.description.length > 50 ? '...' : ''}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => openFieldForm(index)} aria-label="Edit field">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive/90" aria-label="Delete field">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
               <Button type="button" variant="outline" onClick={() => openFieldForm()} className="w-full mt-4">
                 <PlusCircle className="mr-2 h-4 w-4" /> Шинэ талбар нэмэх
               </Button>
               {form.formState.errors.fields && !form.formState.errors.fields.root && (
                 <FormMessage>{form.formState.errors.fields.message}</FormMessage>
               )}
               {form.formState.errors.fields?.root && (
                  <FormMessage>{form.formState.errors.fields.root.message}</FormMessage>
               )}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" disabled={isSubmittingGlobal} onClick={() => router.back()}>Цуцлах</Button>
            <Button type="submit" disabled={isSubmittingGlobal}>
              {isSubmittingGlobal ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {initialData ? 'Өөрчлөлтийг хадгалах' : 'Ангилал үүсгэх'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Field Form Dialog */}
      <Dialog open={isFieldFormOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingFieldIndex(null); 
          fieldFormMethods.clearErrors(); 
        }
        setIsFieldFormOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingFieldIndex !== null ? "Талбар засах" : "Шинэ талбар нэмэх"}</DialogTitle>
            <DialogDescription>
              Энэ талбарын шинж чанарыг тодорхойлно уу. 'Талбарын түлхүүр' нь шошгоноос автоматаар үүсгэгдэнэ. Ангиллын доторх талбарын шошго давтагдахгүй байх ёстой.
            </DialogDescription>
          </DialogHeader>
          <Form {...fieldFormMethods}>
            <form onSubmit={fieldFormMethods.handleSubmit(handleSaveField)} className="space-y-4 py-2">
              <FormField
                control={fieldFormMethods.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Талбарын шошго</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Author Name, Product Price" 
                        {...field} 
                        onChange={(e) => {
                           field.onChange(e); 
                           const newKey = slugify(e.target.value);
                           fieldFormMethods.setValue('key', newKey, { shouldValidate: true });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={fieldFormMethods.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Талбарын түлхүүр (автоматаар үүсгэгдсэн)</FormLabel>
                    <FormControl>
                      <Input placeholder="auto-generated-key" {...field} readOnly className="bg-muted/50" />
                    </FormControl>
                    <FormDescription>This unique key is used in the database. It is generated from the label and must be unique.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={fieldFormMethods.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Талбарын төрөл</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a field type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(FieldType).map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={fieldFormMethods.control}
                name="placeholder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placeholder (Заавал биш)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Enter title here" {...field} value={field.value || ''}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={fieldFormMethods.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Талбарын тайлбар/Туслах текст (Заавал биш)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A short explanation of what this field is for." {...field} value={field.value || ''}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={fieldFormMethods.control}
                name="required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal mb-0!">
                      Энэ талбар заавал бөглөх ёстой
                    </FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Цуцлах</Button>
                </DialogClose>
                <Button type="submit">
                  {editingFieldIndex !== null ? "Талбарын өөрчлөлтийг хадгалах" : "Ангилалд талбар нэмэх"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

    

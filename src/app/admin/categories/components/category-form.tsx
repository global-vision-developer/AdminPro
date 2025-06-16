
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import type { Category, FieldDefinition } from '@/types';
import { FieldType } from '@/types';
import { PlusCircle, Trash2, Save, Loader2, XCircle, Edit3 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

// Schema for individual field definition (client-side, includes client ID)
const fieldDefinitionClientSchema = z.object({
  id: z.string().default(() => uuidv4()), // Client-side unique ID
  label: z.string().min(1, "Field label is required."),
  key: z.string().min(1, "Field key is required (auto-generated from label)."),
  type: z.nativeEnum(FieldType),
  required: z.boolean().default(false),
  placeholder: z.string().optional().default(''),
  description: z.string().optional().default(''),
});

// Schema for the main category form
const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required."),
  slug: z.string().min(1, "Slug is required.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens."),
  description: z.string().optional().default(''),
  fields: z.array(fieldDefinitionClientSchema).min(0, "You can save a category without fields initially."),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
type FieldFormValues = z.infer<typeof fieldDefinitionClientSchema>;

interface CategoryFormProps {
  initialData?: Category | null; // Firestore Category type
  onSubmit: (data: CategoryFormValues) => Promise<{id?: string; error?: string} | {success?: boolean; error?: string } | void>; // onSubmit can now return result for toast
  isSubmittingGlobal: boolean;
  onFormSuccess?: () => void; // Optional: callback after successful submission and toast
}

export function CategoryForm({ initialData, onSubmit, isSubmittingGlobal, onFormSuccess }: CategoryFormProps) {
  const { toast } = useToast();
  const [isFieldFormOpen, setIsFieldFormOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null); // Store index for editing

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      slug: initialData.slug,
      description: initialData.description || '',
      fields: initialData.fields.map(f => ({ ...f, id: f.id || uuidv4() })) // Ensure client IDs
    } : {
      name: '',
      slug: '',
      description: '',
      fields: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "fields",
    keyName: "fieldFormId", // To avoid conflict with 'id' from FieldDefinition
  });

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value;
    form.setValue('name', newName);
    if (!form.formState.dirtyFields.slug || !form.getValues('slug')) {
      form.setValue('slug', slugify(newName));
    }
  };
  
  const handleLabelChangeForFieldKey = (fieldLabel: string, fieldIndex: number) => {
    const newKey = slugify(fieldLabel);
    form.setValue(`fields.${fieldIndex}.key`, newKey, { shouldValidate: true, shouldDirty: true });
  };

  const handleSaveField = (fieldData: FieldFormValues) => {
    if (editingFieldIndex !== null) {
      update(editingFieldIndex, fieldData);
    } else {
      append(fieldData);
    }
    setIsFieldFormOpen(false);
    setEditingFieldIndex(null);
  };

  const openFieldForm = (index?: number) => {
    if (index !== undefined && fields[index]) {
      setEditingFieldIndex(index);
      // fieldForm.reset(fields[index]); // Reset fieldForm with existing data
    } else {
      setEditingFieldIndex(null);
      // fieldForm.reset({ id: uuidv4(), label: '', key: '', type: FieldType.TEXT, required: false, placeholder: '', description: '' });
    }
    setIsFieldFormOpen(true);
  };

  const handleFormSubmit = async (data: CategoryFormValues) => {
    // Check for duplicate field keys before submitting
    const fieldKeys = new Set<string>();
    for (const f of data.fields) {
      if (fieldKeys.has(f.key)) {
        toast({
          title: "Error: Duplicate Field Keys",
          description: `Field key "${f.key}" (from label "${f.label}") is not unique. Please ensure all field labels result in unique keys.`,
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
        description: `Category ${initialData ? "updated" : "created"} successfully.`,
      });
      if (onFormSuccess) onFormSuccess();
      form.reset(); // Reset form after successful submission
    }
    // If onSubmit doesn't return anything, or returns void, no toast is shown here.
    // Caller is responsible for toasts if needed.
  };
  
  // Field Form Logic (inside CategoryForm)
  const fieldFormMethods = useForm<FieldFormValues>({
    resolver: zodResolver(fieldDefinitionClientSchema),
    // defaultValues are set when dialog opens
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
          placeholder: '',
          description: '',
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
              <CardTitle className="font-headline">Category Details</CardTitle>
              <CardDescription>Define the name, slug, and description for this category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
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
                    <FormLabel>Slug (URL Identifier)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., blog-posts, products-info" {...field} />
                    </FormControl>
                    <FormDescription>Must be unique, lowercase, and contain only letters, numbers, and hyphens.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A brief description of what this category is for." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Field Definitions</CardTitle>
              <CardDescription>Define the data structure for entries in this category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No fields defined yet. Click "Add New Field" to get started.
                </p>
              )}
              <div className="space-y-3">
                {fields.map((fieldItem, index) => (
                  <div key={fieldItem.fieldFormId} className="flex items-center justify-between p-3 border rounded-md bg-background shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-medium text-foreground">{fieldItem.label}</p>
                      <p className="text-xs text-muted-foreground">Type: {fieldItem.type} | Key: <span className="font-mono bg-muted px-1 rounded">{fieldItem.key}</span></p>
                      {fieldItem.description && <p className="text-xs text-muted-foreground mt-1">Desc: {fieldItem.description.substring(0,50)}...</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openFieldForm(index)} aria-label="Edit field">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive/90" aria-label="Remove field">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
               <Button type="button" variant="outline" onClick={() => openFieldForm()} className="w-full">
                 <PlusCircle className="mr-2 h-4 w-4" /> Add New Field
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
            <Button type="button" variant="outline" disabled={isSubmittingGlobal} onClick={() => form.reset()}>Cancel</Button>
            <Button type="submit" disabled={isSubmittingGlobal}>
              {isSubmittingGlobal ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {initialData ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Field Form Dialog */}
      <Dialog open={isFieldFormOpen} onOpenChange={setIsFieldFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingFieldIndex !== null ? "Edit Field" : "Add New Field"}</DialogTitle>
            <DialogDescription>
              Define the properties for this field. The 'Field Key' will be auto-generated from the label.
            </DialogDescription>
          </DialogHeader>
          <Form {...fieldFormMethods}>
            <form onSubmit={fieldFormMethods.handleSubmit(handleSaveField)} className="space-y-4 py-2">
              <FormField
                control={fieldFormMethods.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Label</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Author Name, Product Price" 
                        {...field} 
                        onChange={(e) => {
                           field.onChange(e); // RHF's original onChange
                           const newKey = slugify(e.target.value);
                           fieldFormMethods.setValue('key', newKey); // Auto-fill key
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
                    <FormLabel>Field Key (auto-generated)</FormLabel>
                    <FormControl>
                      <Input placeholder="auto-generated-key" {...field} readOnly className="bg-muted/50" />
                    </FormControl>
                    <FormDescription>This unique key is used in the database. It's generated from the label.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={fieldFormMethods.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select field type" />
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
                    <FormLabel>Placeholder (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Enter the title here" {...field} />
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
                    <FormLabel>Field Description/Help Text (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A short explanation of what this field is for." {...field} />
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
                      This field is required
                    </FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">
                  {editingFieldIndex !== null ? "Save Changes to Field" : "Add Field to Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

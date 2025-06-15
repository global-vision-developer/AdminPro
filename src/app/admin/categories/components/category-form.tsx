"use client";

import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Category, FieldDefinition } from '@/types';
import { FieldType } from '@/types';
import { PlusCircle, Trash2, Save, Loader2, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

const fieldDefinitionSchema = z.object({
  id: z.string().default(() => uuidv4()),
  label: z.string().min(1, "Field label is required."),
  type: z.nativeEnum(FieldType),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
});

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required."),
  slug: z.string().min(1, "Slug is required.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens."),
  description: z.string().optional(),
  fields: z.array(fieldDefinitionSchema).min(1, "At least one field is required."),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  initialData?: Category | null;
  onSubmit: (data: CategoryFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function CategoryForm({ initialData, onSubmit, isSubmitting }: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      fields: initialData.fields.map(f => ({ ...f, id: f.id || uuidv4() })) // ensure IDs
    } : {
      name: '',
      slug: '',
      description: '',
      fields: [{ id: uuidv4(), label: '', type: FieldType.TEXT, required: false, placeholder: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('name', event.target.value);
    if (!form.formState.dirtyFields.slug) { // only auto-fill slug if not manually changed
      const newSlug = event.target.value
        .toLowerCase()
        .replace(/\s+/g, '-') // replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, ''); // remove invalid characters
      form.setValue('slug', newSlug);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-4 border-dashed">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  <FormField
                    control={form.control}
                    name={`fields.${index}.label`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Field Label</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Title, Author Name" {...formField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`fields.${index}.type`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Field Type</FormLabel>
                        <Select onValueChange={formField.onChange} defaultValue={formField.value}>
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
                    control={form.control}
                    name={`fields.${index}.placeholder`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Placeholder (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Enter title here" {...formField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                   <FormField
                    control={form.control}
                    name={`fields.${index}.required`}
                    render={({ field: formField }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                        <FormControl>
                          <Checkbox
                            checked={formField.value}
                            onCheckedChange={formField.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Required Field</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => remove(index)}
                      aria-label="Remove field"
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ id: uuidv4(), label: '', type: FieldType.TEXT, required: false, placeholder: '' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
            {form.formState.errors.fields && !form.formState.errors.fields.root && (
                 <FormMessage>{form.formState.errors.fields.message}</FormMessage>
            )}
             {form.formState.errors.fields?.root && (
                <FormMessage>{form.formState.errors.fields.root.message}</FormMessage>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {initialData ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

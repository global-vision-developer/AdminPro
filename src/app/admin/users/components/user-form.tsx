
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
import { Save, Loader2 } from 'lucide-react';

const userFormSchemaBase = z.object({
  name: z.string().min(1, "User name is required."),
  email: z.string().email("Invalid email address."),
  role: z.nativeEnum(UserRole),
});

// Schema for creating a new user (includes password)
const newUserFormSchema = userFormSchemaBase.extend({
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().min(6, "Please confirm your password."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // path to field that will display the error
});

// Schema for editing an existing user (password is not editable here)
const editUserFormSchema = userFormSchemaBase;


export type UserFormValues = z.infer<typeof newUserFormSchema>; // Use the more inclusive type

interface UserFormProps {
  initialData?: UserProfile | null;
  onSubmit: (data: UserFormValues) => Promise<void>;
  isSubmitting: boolean;
  isEditing?: boolean;
}

export function UserForm({ initialData, onSubmit, isSubmitting, isEditing = false }: UserFormProps) {
  const currentSchema = isEditing ? editUserFormSchema : newUserFormSchema;
  const form = useForm<UserFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: initialData ? {
      ...initialData,
      // Ensure password fields are empty or undefined for initialData if not part of it
      password: '', 
      confirmPassword: '',
    } : {
      name: '',
      email: '',
      role: UserRole.SUB_ADMIN,
      password: '',
      confirmPassword: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{isEditing ? 'Edit User' : 'Add New User'}</CardTitle>
            <CardDescription>
              {isEditing ? 'Update the user\'s details and role.' : 'Enter the details for the new user.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} disabled={isEditing} />
                  </FormControl>
                  {isEditing && <FormDescription>Email cannot be changed after creation.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(UserRole).map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditing ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  SUB_ADMIN = 'Sub Admin',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string; // URL to avatar image
}

export enum FieldType {
  TEXT = 'Text',
  TEXTAREA = 'Textarea',
  NUMBER = 'Number',
  DATE = 'Date',
  BOOLEAN = 'Boolean',
  // Future: RICH_TEXT = 'Rich Text',
  // Future: IMAGE_UPLOAD = 'Image Upload',
}

export interface FieldDefinition {
  id: string; // unique ID for the field, e.g., 'title', 'body_content'
  label: string; // User-friendly label, e.g., "Page Title", "Main Content"
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  // Future: options for select/radio, validation rules etc.
}

export interface Category {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier
  description?: string;
  fields: FieldDefinition[];
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

export interface Entry {
  id:string;
  categoryId: string;
  title?: string; // A representative title for the entry, typically from one of its fields
  data: Record<string, any>; // fieldDefinition.id -> value
  status: 'draft' | 'published' | 'scheduled';
  publishAt?: string; // ISO Date string
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  // createdBy: string; // User ID
}

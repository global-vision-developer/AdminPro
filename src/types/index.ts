
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

// Updated FieldType to match existing enum and simplify for now
export enum FieldType {
  TEXT = 'Text',
  TEXTAREA = 'Textarea',
  NUMBER = 'Number',
  DATE = 'Date',
  BOOLEAN = 'Boolean',
  // Future: RICH_TEXT = 'Rich Text', // Keep existing enum values
  // Future: IMAGE_UPLOAD = 'Image Upload',
}

// FieldDefinition remains largely the same but 'key' is important from user's code
export interface FieldDefinition {
  id: string; // Client-side unique ID (e.g., from uuidv4)
  key: string; // Firestore key, derived from label, e.g., "full_name" (must be unique within a category)
  label: string; // User-friendly label, e.g., "Page Title"
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  description?: string; // Optional description for the field
  // useRichTextDescription?: boolean; // Will not be implemented for now
}

export interface Category {
  id: string; // Firestore document ID
  name: string;
  slug: string; // Added slug as it was in original CategoryForm and useful
  description?: string; // Added description from original form
  fields: FieldDefinition[];
  createdAt?: string; // ISO Date string
  updatedAt?: string; // ISO Date string
}

export interface Entry {
  id: string; // Firestore document ID
  categoryId: string; // Reference to Category document ID
  title?: string; // A representative title for the entry, might be from data
  // categoryName: string; // Denormalized category name for display - can be fetched if needed
  data: Record<string, any>; // Stores fieldDefinition.key: value pairs
  status: 'draft' | 'published' | 'scheduled';
  publishAt?: string; // ISO Date string
  createdAt: string; // ISO Date string
  updatedAt?: string; // ISO Date string
}

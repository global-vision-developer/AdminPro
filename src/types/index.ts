
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
  IMAGE_GALLERY = 'Image Gallery', // New FieldType
}

// Interface for items within an Image Gallery field in the form
export interface ImageGalleryItemForm {
  clientId: string; // For react-hook-form useFieldArray key
  imageUrl: string;
  description?: string;
}

// Firestore-д хадгалагдах зургийн цомгийн нэг зүйлийн бүтэц
export interface ImageGalleryItemStored {
  imageUrl: string;
  description?: string;
}


export interface FieldDefinition {
  id: string; 
  key: string; 
  label: string; 
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  description?: string; 
}

export interface Category {
  id: string; 
  name: string;
  slug: string; 
  description?: string; 
  fields: FieldDefinition[];
  createdAt?: string; 
  updatedAt?: string; 
}

export interface Entry {
  id: string; 
  categoryId: string; 
  title?: string; 
  categoryName?: string; // Added for convenience in EntryList, to avoid extra lookups if already available
  data: Record<string, any | ImageGalleryItemStored[]>; // data can hold ImageGalleryItemStored arrays
  status: 'draft' | 'published' | 'scheduled';
  publishAt?: string; 
  createdAt: string; 
  updatedAt?: string; 
}

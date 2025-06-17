
export enum UserRole {
  SUPER_ADMIN = 'Супер Админ',
  SUB_ADMIN = 'Sub Admin',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string; // URL to avatar image
  allowedCategoryIds?: string[]; // For Sub Admins, IDs of categories they can manage
}

export enum FieldType {
  TEXT = 'Text',
  TEXTAREA = 'Textarea',
  NUMBER = 'Number',
  DATE = 'Date',
  BOOLEAN = 'Boolean',
  IMAGE_GALLERY = 'Image Gallery', 
}

// Interface for items within an Image Gallery field in the form
export interface ImageGalleryItemForm {
  clientId: string; // For react-hook-form useFieldArray key
  imageUrl: string | null; // Can be null if image is removed
  description?: string;
}

// Firestore-д хадгалагдах зургийн цомгийн нэг зүйлийн бүтэц
export interface ImageGalleryItemStored {
  imageUrl: string; // Should always have a URL if stored
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
  coverImageUrl?: string | null; // Added for category cover image
  createdAt?: string; 
  updatedAt?: string; 
}

export interface Entry {
  id: string; 
  categoryId: string; 
  title?: string; 
  categoryName?: string; 
  data: Record<string, any | ImageGalleryItemStored[]>; 
  status: 'draft' | 'published' | 'scheduled';
  publishAt?: string; 
  createdAt: string; 
  updatedAt?: string; 
}

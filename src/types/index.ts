
export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  SUB_ADMIN = 'Sub Admin',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  allowedCategoryIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export enum FieldType {
  TEXT = 'Text',
  TEXTAREA = 'Textarea',
  NUMBER = 'Number',
  DATE = 'Date',
  BOOLEAN = 'Boolean',
  IMAGE_GALLERY = 'Image Gallery',
}

export interface ImageGalleryItemForm {
  clientId: string;
  imageUrl: string | null;
  description?: string;
}

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
  coverImageUrl?: string | null;
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


export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  fcmTokens?: string[];
}

export interface NotificationTarget {
  userId: string;
  userEmail?: string;
  userName?: string;
  token: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  messageId?: string;
  attemptedAt?: string;
}

export interface NotificationLog {
  id?: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  scheduleAt?: string | null;
  adminCreator: {
    uid: string;
    name?: string;
    email: string;
  };
  createdAt: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'partially_completed' | 'error' | 'scheduled' | 'completed_no_targets';
  processedAt?: string | null;
  targets: NotificationTarget[];
}


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

// For App Users (distinct from Admin Users/UserProfiles)
export interface AppUser {
  id: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  fcmTokens?: string[]; // Array of FCM registration tokens
  // other app-specific user fields can go here
}

export interface NotificationTarget {
  userId: string;
  userEmail?: string; 
  userName?: string;  
  token: string;      
  status: 'pending' | 'success' | 'failed';
  error?: string;     
  messageId?: string; 
  attemptedAt?: string; // When the Firebase Function attempted to send
}

// Represents a notification request logged by an admin, to be processed by a Firebase Function
export interface NotificationLog {
  id?: string; // Firestore document ID
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  scheduleAt?: string | null; // ISO string, for when it should be sent (optional)
  
  // Admin-set metadata
  adminCreator: {
    uid: string;
    name?: string; // Admin's name
    email: string;   // Admin's email
  };
  createdAt: string; // ISO string, when the admin created this notification request (client-generated or serverTimestamp)

  // Firebase Function processed metadata (optional, set by function)
  processingStatus: 'pending' | 'processing' | 'completed' | 'partially_completed' | 'error';
  processedAt?: string | null; // ISO string, when FF started/finished processing
  
  targets: NotificationTarget[]; // List of users/tokens this notification is for
  // This will be populated by the admin action with initial status 'pending'
  // The Firebase Function will update the status for each target.
}

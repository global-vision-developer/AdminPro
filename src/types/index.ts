
export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  SUB_ADMIN = 'Sub Admin',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string; // URL to avatar image or Base64 data URI
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
  imageUrl: string | null; // Can be Base64 data URI or existing URL
  description?: string;
}

export interface ImageGalleryItemStored {
  imageUrl: string; // Can be Base64 data URI or existing URL
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
  coverImageUrl?: string | null; // Can be Base64 data URI or existing URL
  createdAt?: string;
  updatedAt?: string;
}

export interface Entry {
  id: string;
  categoryId: string;
  title?: string;
  categoryName?: string;
  data: Record<string, any | ImageGalleryItemStored[]>; // Image URLs here can be Base64
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

export interface NotificationLog {
  id?: string; // Firestore document ID
  title: string;
  body: string;
  imageUrl?: string | null; // Can be Base64 data URI or existing URL
  deepLink?: string | null;
  scheduleAt?: string | null; // ISO string, for when it should be sent (optional)
  adminCreator: {
    uid: string;
    name?: string; // Admin's name
    email: string;   // Admin's email
  };
  createdAt: string; // ISO string, when the admin created this notification request (client-generated or serverTimestamp)
  processingStatus: 'pending' | 'processing' | 'completed' | 'partially_completed' | 'error';
  processedAt?: string | null; // ISO string, when FF started/finished processing
  targets: NotificationTarget[];
}

export interface Banner {
  id: string;
  imageUrl: string | null; // Base64 data URI
  description: string;
  link?: string | null; // Optional URL the banner links to
  isActive: boolean; // To control visibility
  createdAt?: string; // ISO string timestamp
  updatedAt?: string; // ISO string timestamp
}

export enum AnketStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Anket {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  cvLink?: string; // URL to CV/Resume
  message?: string; // Cover letter or additional message
  submittedAt: string; // ISO string timestamp
  status: AnketStatus;
  processedBy?: string; // Admin UID who processed it
  processedAt?: string; // ISO string timestamp
}

// Help Section Types
export enum HelpTopic {
  APPLICATION_GUIDE = 'Аппликэйшн ашиглах заавар',
  TRAVEL_TIPS = 'Хэрхэн хямд аялах вэ?',
}

export interface HelpItem {
  id: string;
  topic: HelpTopic;
  question: string;
  answer: string;
  isPredefined: boolean; // True for FAQs, false for user-submitted (once answered)
  createdAt?: string; // ISO string timestamp
  updatedAt?: string; // ISO string timestamp
}

export interface HelpRequest {
  id?: string; // Firestore document ID
  topic: HelpTopic;
  question: string;
  userId?: string; // UID of the admin who submitted, if applicable from admin panel
  userEmail?: string; // Email of the admin
  status: 'pending' | 'answered'; // Status of the request
  createdAt: string; // ISO string timestamp
}

    
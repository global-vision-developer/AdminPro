
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

export interface Banner {
  id: string;
  imageUrl: string | null;
  description: string;
  link?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  cvLink?: string;
  message?: string;
  submittedAt: string;
  status: AnketStatus;
  processedBy?: string;
  processedAt?: string;
}


export enum HelpTopic {
  APPLICATION_GUIDE = "Аппликэйшн ашиглах заавар",
  TRAVEL_TIPS = "Хэрхэн хямд аялах вэ?",
}

export const HELP_TOPIC_DISPLAY_NAMES: Record<HelpTopic | string, string> = {
  [HelpTopic.APPLICATION_GUIDE]: "Аппликэйшн ашиглах заавар",
  [HelpTopic.TRAVEL_TIPS]: "Хэрхэн хямд аялах вэ?",
  "all_topics": "Бүх Сэдэв",
};


export interface HelpItem {
  id: string;
  topic: HelpTopic;
  question: string;
  answer: string;
  isPredefined: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}


export interface HelpRequest {
  id?: string;
  topic: HelpTopic; // Should remain HelpTopic for consistency if this type is used
  question: string;
  userId?: string;
  userEmail?: string;
  status: 'pending' | 'answered' | 'archived';
  createdAt: string;
  answeredAt?: string;
  adminNotes?: string;
}
    

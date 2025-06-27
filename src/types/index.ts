/**
 * @fileoverview Centralized type definitions for the entire Admin Pro application.
 * This file contains all the core data structures, enums, and interfaces used across
 * both the client-side (Next.js) and server-side (Firebase Functions) code,
 * ensuring type safety and consistency.
 */

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  SUB_ADMIN = 'Sub Admin',
}

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  allowedCategoryIds?: string[];
  canSendNotifications?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export enum FieldType {
  TEXT = 'Text',
  TEXTAREA = 'Textarea',
  NUMBER = 'Number',
  DATE = 'Date',
  BOOLEAN = 'Boolean',
  IMAGE = 'Image',
  IMAGE_GALLERY = 'Image Gallery',
  CITY_PICKER = 'City Picker', // Added
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


export enum AnketStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface Anket {
  id: string;
  name: string;
  email: string;
  status: AnketStatus;
  submittedAt: string;
  processedBy?: string;
  processedAt?: string;

  // New fields from user's provided data
  uid: string;
  photoUrl?: string;
  selfieImageUrl?: string;
  idCardFrontImageUrl?: string;
  idCardBackImageUrl?: string;
  wechatId?: string;
  wechatQrImageUrl?: string;
  chinaPhoneNumber?: string;
  inChinaNow?: boolean;
  currentCityInChina?: string; // The city ID
  currentCityInChinaName?: string; // The resolved city name
  canWorkInOtherCities?: string[]; // Array of city IDs
  canWorkInOtherCitiesNames?: string[]; // Array of resolved city names
  yearsInChina?: number | null;
  nationality?: string;
  speakingLevel?: string;
  writingLevel?: string;
  chineseExamTaken?: boolean;
  workedAsTranslator?: boolean;
  translationFields?: string[];
  dailyRate?: string;
  isActive?: boolean;
  isProfileComplete?: boolean;
  itemType?: string;
  message?: string; // from description field
  
  // Legacy fields for compatibility
  cvLink?: string;
  averageRating?: number | null;
}


export enum CityType {
  MAJOR = "Major",
  OTHER = "Other"
}

export const CITY_TYPE_DISPLAY_NAMES: { [key in CityType | 'all_types']: string } = {
  [CityType.MAJOR]: "Том хот",
  [CityType.OTHER]: "Бусад",
  'all_types': "Бүх төрөл"
};

export interface City {
  id: string;
  name: string;
  nameCN: string;
  order: number;
  cityType: CityType;
  iataCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export enum HelpTopic {
  APPLICATION_GUIDE = "application_guide",
  TRAVEL_TIPS = "travel_tips",
}

export const HELP_TOPIC_DISPLAY_NAMES: { [key in HelpTopic | 'all_topics']: string } = {
  [HelpTopic.APPLICATION_GUIDE]: "Аппын заавар",
  [HelpTopic.TRAVEL_TIPS]: "Аяллын зөвлөгөө",
  "all_topics": "Бүх сэдэв"
};

export interface HelpItem {
  id: string;
  topic: HelpTopic;
  question: string;
  answer: string;
  isPredefined: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

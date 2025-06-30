/**
 * @fileoverview Centralized type definitions for the entire Admin Pro application.
 * This file contains all the core data structures, enums, and interfaces used across
 * both the client-side (Next.js) and server-side (Firebase Functions) code,
 * ensuring type safety and consistency.
 * 
 * Энэ файл нь "Админ Про" аппликейшны бүх хэсэгт ашиглагдах TypeScript-ийн төрлийн
 * тодорхойлолтуудыг нэг дор төвлөрүүлсэн. Энд өгөгдлийн бүтэц (interface), сонголттой
 * утгууд (enum)-ыг тодорхойлсноор кодын чанар, найдвартай байдлыг хангадаг.
 */

// Админ хэрэглэгчийн эрхийн төрөл
export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  SUB_ADMIN = 'Sub Admin',
}

// Админ хэрэглэгчийн профайлын бүтэц
export interface UserProfile {
  id: string; // Firestore document ID
  uid?: string; // Firebase Auth UID
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  allowedCategoryIds?: string[]; // Дэд админд зөвшөөрөгдсөн категорийн ID-нууд
  canSendNotifications?: boolean; // Мэдэгдэл илгээх эрхтэй эсэх
  createdAt?: string;
  updatedAt?: string;
}

// Динамик категорид ашиглагдах талбарын төрлүүд
export enum FieldType {
  TEXT = 'Text',
  TEXTAREA = 'Textarea',
  NUMBER = 'Number',
  DATE = 'Date',
  BOOLEAN = 'Boolean',
  IMAGE = 'Image',
  IMAGE_GALLERY = 'Image Gallery',
  CITY_PICKER = 'City Picker', // Хотын сонгогч
}

// Зургийн галлерей талбарт ашиглагдах нэг зургийн мэдээлэл (Формд ашиглах)
export interface ImageGalleryItemForm {
  clientId: string; // Зөвхөн клиент талд массивтай ажиллахад зориулагдсан ID
  imageUrl: string | null;
  description?: string;
}

// Зургийн галлерей талбарт ашиглагдах нэг зургийн мэдээлэл (Firestore-д хадгалах)
export interface ImageGalleryItemStored {
  imageUrl: string;
  description?: string;
}

// Категорийн нэг талбарын бүтцийн тодорхойлолт
export interface FieldDefinition {
  id: string;
  key: string; // Латин, жижиг үсгээр, өгөгдлийн санд ашиглагдах түлхүүр
  label: string; // Хэрэглэгчид харагдах нэр
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
}

// Үндсэн контентийн категорийн бүтэц
export interface Category {
  id: string;
  name: string;
  slug: string; // URL-д ашиглагдах давтагдашгүй нэр
  description?: string;
  fields: FieldDefinition[]; // Энэ категорид хамаарах талбаруудын жагсаалт
  coverImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Нэг контентийн бүртгэлийн бүтэц
export interface Entry {
  id: string;
  categoryId: string;
  title?: string;
  categoryName?: string;
  data: Record<string, any | ImageGalleryItemStored[]>; // Категорийн `fields`-д тодорхойлсон өгөгдлийг агуулна
  status: 'draft' | 'published' | 'scheduled'; // Бүртгэлийн төлөв
  publishAt?: string; // Төлөвлөсөн огноо
  createdAt: string;
  updatedAt?: string;
}

// Аппликейшны жирийн хэрэглэгчийн бүтэц (мэдэгдэл илгээхэд ашиглана)
export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  fcmTokens?: string[]; // Push notification token-ууд
}

// Нэг мэдэгдэл илгээхэд онилсон хэрэглэгчийн үр дүнгийн бүтэц
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

// Илгээсэн мэдэгдлийн түүхийн (log) бүтэц
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

// Анкетын төлөв
export enum AnketStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// Хэрэглэгчээс ирүүлсэн анкетын бүтэц
export interface Anket {
  id: string;
  name: string;
  email: string;
  status: AnketStatus;
  submittedAt: string;
  processedBy?: string; // Боловсруулсан админы ID
  processedAt?: string; // Боловсруулсан огноо

  // Анкетын дэлгэрэнгүй мэдээлэл
  uid: string;
  photoUrl?: string;
  selfieImageUrl?: string;
  idCardFrontImageUrl?: string;
  idCardBackImageUrl?: string;
  wechatId?: string;
  wechatQrImageUrl?: string;
  chinaPhoneNumber?: string;
  inChinaNow?: boolean;
  currentCityInChina?: string; // Хотын ID
  currentCityInChinaName?: string; // Хотын нэр
  canWorkInOtherCities?: string[]; // Ажиллах боломжтой бусад хотын ID-нууд
  canWorkInOtherCitiesNames?: string[]; // Хотуудын нэр
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
  message?: string;
  
  // Хуучин системтэй нийцэх талбарууд
  cvLink?: string;
  averageRating?: number | null;
}

// Хотын төрөл
export enum CityType {
  MAJOR = "Major",
  OTHER = "Other"
}

// Хотын төрлийг UI-д харуулах нэрс
export const CITY_TYPE_DISPLAY_NAMES: { [key in CityType | 'all_types']: string } = {
  [CityType.MAJOR]: "Том хот",
  [CityType.OTHER]: "Бусад",
  'all_types': "Бүх төрөл"
};

// Системд бүртгэлтэй хотын бүтэц
export interface City {
  id: string;
  name: string;
  nameCN: string;
  order: number;
  cityType: CityType;
  iataCode?: string; // Нисэх онгоцны буудлын код
  createdAt?: string;
  updatedAt?: string;
}

// Тусламж (FAQ) хэсгийн сэдвийн төрөл
export enum HelpTopic {
  APPLICATION_GUIDE = "application_guide",
  TRAVEL_TIPS = "travel_tips",
}

// Тусламжийн сэдвийг UI-д харуулах нэрс
export const HELP_TOPIC_DISPLAY_NAMES: { [key in HelpTopic | 'all_topics']: string } = {
  [HelpTopic.APPLICATION_GUIDE]: "Аппын заавар",
  [HelpTopic.TRAVEL_TIPS]: "Аяллын зөвлөгөө",
  "all_topics": "Бүх сэдэв"
};

// Тусламжийн нэг асуулт/хариултын бүтэц
export interface HelpItem {
  id: string;
  topic: HelpTopic;
  question: string;
  answer: string;
  isPredefined: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string; // Үүсгэсэн админы ID
}


// This file is to define types used within the Cloud Functions environment.
// It might duplicate some types from the main app's src/types/index.ts
// but ensures the functions environment is self-contained.

export enum UserRole {
  SUPER_ADMIN = "Super Admin",
  SUB_ADMIN = "Sub Admin",
}

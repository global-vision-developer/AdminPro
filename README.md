
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Proposed Firestore Database Structure

This section outlines the recommended Firestore database structure for the application.

### `admins` Collection (Formerly `users`)

Stores admin user profile information and roles for the CMS. This collection is distinct from any general user collection your main application might have.

*   **Document ID:** `uid` (from Firebase Authentication)
*   **Fields:**
    *   `email: string` (Admin's email)
    *   `name: string` (Admin's display name)
    *   `role: string` (e.g., "Super Admin", "Sub Admin" - matching `UserRole` enum from `src/types/index.ts`)
    *   `avatar: string` (URL to avatar image, optional)
    *   `createdAt: firebase.firestore.Timestamp` (Server timestamp when the admin document was created)
    *   `updatedAt: firebase.firestore.Timestamp` (Server timestamp when the admin document was last updated, optional)

*This collection is utilized by `src/contexts/auth-context.tsx` for managing admin user sessions and roles within the admin panel.*

### `categories` Collection

Stores definitions for content categories (e.g., Blog Posts, Products).

*   **Document ID:** Auto-generated Firestore ID (recommended)
*   **Fields:**
    *   `name: string` (e.g., "Blog Posts")
    *   `slug: string` (URL-friendly identifier, e.g., "blog-posts". Should be unique if used for routing.)
    *   `description: string` (Optional, a brief description of the category)
    *   `fields: array` (An array of field definition objects, mirroring `FieldDefinition` from `src/types/index.ts`)
        *   Each object in the array: `{ id: string, label: string, type: string (matching FieldType enum), required: boolean, placeholder: string (optional) }`
    *   `createdAt: firebase.firestore.Timestamp`
    *   `updatedAt: firebase.firestore.Timestamp`
    *   `entryCount: number` (Optional: for quickly displaying how many entries belong to this category. Can be updated with Cloud Functions or batched writes for consistency.)


### `entries` Collection

Stores individual content entries belonging to a specific category.

*   **Document ID:** Auto-generated Firestore ID
*   **Fields:**
    *   `categoryId: string` (ID of the document in the `categories` collection this entry belongs to)
    *   `title: string` (A general title for the entry, useful for display in lists and admin UI. This might be derived from a specific field in `data` if a standard 'title' field exists in the category definition, or can be a separate field.)
    *   `data: map` (An object where keys are `fieldDefinition.id` from the parent category's `fields` array, and values are the actual content for those fields.)
        *   Example: `data: { title: "My First Blog Post", content: "...", authorName: "John Doe" }`
    *   `status: string` (e.g., "draft", "published", "scheduled" - matching `Entry['status']` type)
    *   `publishAt: firebase.firestore.Timestamp` (Optional, used if `status` is "scheduled")
    *   `createdAt: firebase.firestore.Timestamp`
    *   `updatedAt: firebase.firestore.Timestamp`
    *   `createdBy: string` (UID of the admin user who created the entry, optional)
    *   `slug: string` (Optional: URL-friendly identifier for the entry, if needed for public-facing URLs. Could be derived from a title field.)

This structure is designed to be scalable and flexible, allowing for dynamic content types based on category definitions. Firestore security rules should be configured to protect this data appropriately (e.g., only authenticated admins can write to `admins`, `categories`, `entries`).

## Firestore Indexes

As you build queries for Firestore, you might encounter errors like "The query requires an index." This means you need to create a composite index in your Firebase console for that specific query to work efficiently.

### Required Indexes:

1.  **For the `entries` collection (used in `src/lib/actions/entryActions.ts` -> `getEntries`):**
    *   **Fields to index:**
        *   `categoryId` (Ascending)
        *   `createdAt` (Descending)
    *   **Collection:** `entries`
    *   **Purpose:** Allows filtering entries by `categoryId` and ordering them by `createdAt`.
    *   **Creation Link (from a typical error):** The error message in the Next.js console or Firebase Functions logs will usually provide a direct link to create the missing index. It will look similar to this:
        `https://console.firebase.google.com/v1/r/project/YOUR_PROJECT_ID/firestore/indexes?create_composite=...`
    *   **Specific link for `setgelzuin-app` project (from your error):**
        `https://console.firebase.google.com/v1/r/project/setgelzuin-app/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9zZXRnZWx6dWluLWFwcC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZW50cmllcy9pbmRleGVzL18QARoOCgpjYXRlZ29yeUlkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg`
        Please use the link provided in **your specific error message** to create this index in the Firebase Console.

Always check the Firebase console or your server logs for specific index creation links if you encounter these errors.

## Firestore Security Rules

**Example Firestore Security Rules Snippet (Conceptual):**
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admins collection
    match /admins/{adminId} {
      allow read: if request.auth != null && request.auth.uid == adminId; // Own record
      allow list, write: if request.auth != null && get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'Super Admin';
    }

    // Categories collection
    match /categories/{categoryId} {
      allow read: if request.auth != null; // Authenticated admins can read
      allow list, create, update, delete: if request.auth != null && 
                                          (get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'Super Admin' ||
                                           get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'Sub Admin');
    }

    // Entries collection
    match /entries/{entryId} {
      allow read: if request.auth != null; // Authenticated admins can read
      allow list, create, update, delete: if request.auth != null &&
                                          (get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'Super Admin' ||
                                           get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'Sub Admin');
    }
  }
}
```
*Remember to tailor security rules to your specific application needs.*

## Environment Variables

Ensure you have a `.env.local` file in the root of your project with your Firebase project configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID (optional)
```
Replace `YOUR_...` with your actual Firebase project credentials.
Remember to restart your development server (`npm run dev`) after creating or modifying `.env.local`.

```

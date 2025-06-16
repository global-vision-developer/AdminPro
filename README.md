
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

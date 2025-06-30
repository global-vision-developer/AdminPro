// functions/src/index.ts
/**
 * Энэ файл нь Firebase Cloud Functions-ийн backend логикийг агуулдаг.
 * Энд тодорхойлсон функцүүдийг клиент талаас (Next.js апп) аюулгүйгээр дуудаж ажиллуулдаг.
 * Эдгээр нь админ эрх шаардсан үйлдлүүдийг хийхэд зориулагдсан.
 */

import {
  onCall,
  type CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {UserRole} from "./types";

// Firebase Admin SDK-г эхлүүлнэ (зөвхөн нэг удаа)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();
const fAuth = admin.auth(); // Firebase Admin Auth instance

interface UserProfile {
  uid: string;
  name: string;
  email: string;
}

// Мэдэгдэл илгээх функцийн оролтын өгөгдлийн бүтэц
interface SendNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  scheduleAt?: string | null; // ISO string from client
  selectedUserIds: string[]; // Changed from selectedUsers
  adminCreator: Pick<UserProfile, "uid" | "name" | "email">;
}

// Firestore-д хадгалах log-ийн төрлүүд
interface NotificationTargetForLog {
  userId: string;
  userEmail?: string;
  userName?: string;
  token: string;
  status: "success" | "failed"; // No pending state
  error?: string;
  messageId?: string;
  attemptedAt: FirebaseFirestore.Timestamp;
}

interface NotificationLog {
  title: string;
  body: string;
  imageUrl: string | null;
  deepLink: string | null;
  adminCreator: Pick<UserProfile, "uid" | "name" | "email">;
  createdAt: FirebaseFirestore.FieldValue;
  targets: NotificationTargetForLog[];
  processingStatus:
    | "completed"
    | "partially_completed"
    | "scheduled"
    | "completed_no_targets";
  scheduleAt: FirebaseFirestore.Timestamp | null;
}

/**
 * Сонгосон хэрэглэгчид рүү push notification илгээх Cloud Function.
 * Энэ нь шууд эсвэл хуваарийн дагуу илгээх боломжтой.
 */
export const sendNotification = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<SendNotificationPayload>) => {
    // 1. Нэвтэрсэн эсэхийг шалгах
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    try {
      const {
        title,
        body,
        imageUrl,
        deepLink,
        scheduleAt,
        selectedUserIds,
        adminCreator,
      } = request.data;

      // 2. Шаардлагатай мэдээлэл байгаа эсэхийг шалгах
      if (
        !title ||
        !body ||
        !selectedUserIds ||
        !Array.isArray(selectedUserIds) ||
        selectedUserIds.length === 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: title, body, and selectedUserIds."
        );
      }

      // 3. Хуваарьт мэдэгдэл бол Firestore-д хадгалаад функцээс гарах
      if (scheduleAt && new Date(scheduleAt).getTime() > Date.now()) {
        const scheduledLog: NotificationLog = {
          title,
          body,
          imageUrl: imageUrl || null,
          deepLink: deepLink || null,
          adminCreator,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          targets: [], // Дараа нь өөр функц боловсруулна
          processingStatus: "scheduled",
          scheduleAt: admin.firestore.Timestamp.fromDate(new Date(scheduleAt)),
        };
        const docRef = await db.collection("notifications").add(scheduledLog);
        logger.info(`Notification ${docRef.id} has been scheduled for later.`);
        return {
          success: true,
          message: `Мэдэгдэл хуваарьт амжилттай орлоо (ID: ${docRef.id}).`,
        };
      }

      // 4. Шууд илгээх бол хэрэглэгчдийн FCM token-уудыг авах
      const usersRef = db.collection("users");
      const userDocs = selectedUserIds.length > 0 ? await db.getAll(...selectedUserIds.map((id) => usersRef.doc(id))) : [];

      const tokensToSend: string[] = [];
      const tokenToUserMap = new Map<string, { id: string; email?: string; displayName?: string; }>();

      for (const userDoc of userDocs) {
          if (userDoc.exists) {
              const userData = userDoc.data()!;
              const userTokens: string[] = [];

              if (userData.fcmToken && typeof userData.fcmToken === 'string') {
                  userTokens.push(userData.fcmToken);
              } else if (Array.isArray(userData.fcmTokens)) {
                  userTokens.push(...userData.fcmTokens.filter(t => typeof t === 'string' && t));
              }

              if (userTokens.length > 0) {
                  const userInfo = {
                      id: userDoc.id,
                      email: userData.email,
                      displayName: userData.displayName,
                  };
                  userTokens.forEach((token) => {
                      if (token && !tokenToUserMap.has(token)) {
                          tokensToSend.push(token);
                          tokenToUserMap.set(token, userInfo);
                      }
                  });
              }
          }
      }
      
      // 5. Илгээх token байхгүй бол log үүсгээд гарах
      if (tokensToSend.length === 0) {
        const noTokenLog: Partial<NotificationLog> = {
          title,
          body,
          adminCreator,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          processingStatus: "completed_no_targets",
          targets: [],
        };
        await db.collection("notifications").add(noTokenLog);
        return {
          success: false,
          message: "Сонгосон хэрэглэгчдэд идэвхтэй FCM token олдсонгүй.",
        };
      }

      // 6. Firebase Cloud Messaging (FCM) рүү илгээх payload-г бэлтгэх
      const dataPayloadForFCM: { [key:string]: string } = {
        titleKey: title,
        descriptionKey: body,
        itemType: "general",
        link: deepLink || '', 
        imageUrl: imageUrl || '', 
        descriptionPlaceholders: JSON.stringify({}), 
        dataAiHint: '', 
        isGlobal: "false",
        read: "false",
        _internalMessageId: new Date().getTime().toString() + Math.random().toString(),
      };

      const messagePayload: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
          ...(imageUrl && { imageUrl }),
        },
        webpush: {
          notification: {
            title,
            body,
            ...(imageUrl && { image: imageUrl }),
            icon: "https://placehold.co/96x96.png?text=AP&bg=FF5733&txt=FFFFFF",
            badge: "https://placehold.co/96x96.png?text=AP&bg=FF5733&txt=FFFFFF",
          },
        },
        android: {
          priority: "high",
          notification: {
            channelId: "default_channel"
          }
        },
        tokens: tokensToSend,
        data: dataPayloadForFCM,
      };

      // 7. Мэдэгдлийг илгээх
      logger.info(`Sending ${tokensToSend.length} messages.`);
      const response = await messaging.sendEachForMulticast(messagePayload);
      const currentTimestamp = admin.firestore.Timestamp.now();

      // 8. Илгээлтийн үр дүнг log болгож хадгалах
      const targetsForLog: NotificationTargetForLog[] = [];
      response.responses.forEach((result, index) => {
        const token = tokensToSend[index];
        const user = tokenToUserMap.get(token);

        const targetLog: Partial<NotificationTargetForLog> = {
          userId: user?.id || "unknown",
          token: token,
          status: result.success ? "success" : "failed",
          attemptedAt: currentTimestamp,
        };

        if (user?.email) {
          targetLog.userEmail = user.email;
        }
        if (user?.displayName) {
          targetLog.userName = user.displayName;
        }

        if (result.success) {
          if (result.messageId) {
            targetLog.messageId = result.messageId;
          }
        } else {
          if (result.error) {
            targetLog.error = result.error.message;
          }
        }
        targetsForLog.push(targetLog as NotificationTargetForLog);
      });

      const finalProcessingStatus =
        response.failureCount === 0 ? "completed" : "partially_completed";

      const finalLog: NotificationLog = {
        title,
        body,
        imageUrl: imageUrl || null,
        deepLink: deepLink || null,
        adminCreator,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        targets: targetsForLog,
        processingStatus: finalProcessingStatus,
        scheduleAt: scheduleAt ?
          admin.firestore.Timestamp.fromDate(new Date(scheduleAt)) :
          null,
      };

      const docRef = await db.collection("notifications").add(finalLog);
      logger.info(`Notification sent and log ${docRef.id} created.`);

      return {
        success: true,
        message: `Мэдэгдэл илгээгдлээ. ${response.successCount} амжилттай, ${response.failureCount} амжилтгүй.`,
      };
    } catch (error: unknown) {
      logger.error("Error in sendNotification function:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while sending the notification.",
        {
          originalErrorMessage: (error as Error).message,
        }
      );
    }
  }
);

const ADMINS_COLLECTION = "admins";

// Админ хэрэглэгчийн мэдээлэл шинэчлэх оролтын өгөгдлийн бүтэц
interface UpdateAdminUserData {
  targetUserId: string;
  name?: string;
  email?: string;
  newPassword?: string;
  role?: UserRole;
  avatar?: string;
  allowedCategoryIds?: string[];
  canSendNotifications?: boolean;
}

/**
 * Админ хэрэглэгчийн мэдээллийг (Firebase Auth болон Firestore) шинэчлэх Cloud Function.
 * Зөвхөн Сүпер Админ бусад хэрэглэгчийг засах эрхтэй.
 */
export const updateAdminAuthDetails = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<UpdateAdminUserData>) => {
    // 1. Нэвтрэлт болон эрхийн шалгалт
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const callerUid = request.auth.uid;
    const {
      targetUserId,
      name,
      email,
      newPassword,
      role,
      avatar,
      allowedCategoryIds,
      canSendNotifications,
    } = request.data;

    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "targetUserId is required.");
    }
    
    const isEditingSelf = callerUid === targetUserId;

    // Дуудаж буй хэрэглэгчийн эрхийг шалгах
    const callerAdminDoc = await db.collection(ADMINS_COLLECTION).doc(callerUid).get();
    if (!callerAdminDoc.exists) {
        throw new HttpsError("permission-denied", "Caller is not a valid admin.");
    }
    const isCallerSuperAdmin = callerAdminDoc.data()?.role === UserRole.SUPER_ADMIN;

    // --- Эрхийн шалгалтууд ---
    if (!isCallerSuperAdmin) { // Хэрэв сүпер админ биш бол
        if (!isEditingSelf) { // Зөвхөн өөрийгөө засах ёстой
            throw new HttpsError("permission-denied", "You do not have permissions to edit other users.");
        }
        // Дэд админ зөвхөн нэр, аватараа л сольж чадна
        if (email || newPassword || role || allowedCategoryIds !== undefined || canSendNotifications !== undefined) {
             throw new HttpsError("permission-denied", "You can only update your name and avatar.");
        }
    }
    
    // Сүпер админд хамаарах тусгай шалгалтууд (үндсэн админыг хамгаалах)
    if (isCallerSuperAdmin) {
        try {
            const targetUserRecord = await fAuth.getUser(targetUserId);
            if (
                targetUserRecord.email === "admin@pro.com" &&
                (email && email !== "admin@pro.com" || role && role !== UserRole.SUPER_ADMIN)
            ) {
                throw new HttpsError(
                "permission-denied",
                "Cannot change the email or role of the primary super admin account."
                );
            }
        } catch (error: unknown) {
            logger.error("Error fetching target user for pre-check:", error);
        }
    }

    try {
      // 2. Firebase Auth-д шинэчлэх payload-г бэлтгэх
      const updatePayloadAuth: {
        email?: string;
        password?: string;
        displayName?: string;
        photoURL?: string;
      } = {};
      if (email) updatePayloadAuth.email = email;
      if (newPassword) updatePayloadAuth.password = newPassword;
      if (name) updatePayloadAuth.displayName = name;
      if (avatar) updatePayloadAuth.photoURL = avatar;

      // Auth-г шинэчлэх (хэрэв өөрчлөлт байвал)
      if (Object.keys(updatePayloadAuth).length > 0) {
        await fAuth.updateUser(targetUserId, updatePayloadAuth);
      }

      // 3. Firestore-д шинэчлэх payload-г бэлтгэх
      const updatePayloadFirestore: Record<string, any> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (email) updatePayloadFirestore.email = email;
      if (name) updatePayloadFirestore.name = name;
      if (avatar) updatePayloadFirestore.avatar = avatar;
      
      // Эрх, зөвшөөрлийг зөвхөн сүпер админ л өөрчилнө
      if (isCallerSuperAdmin) {
        if (role) updatePayloadFirestore.role = role;
        if (role === UserRole.SUB_ADMIN) {
            if (allowedCategoryIds !== undefined) {
            updatePayloadFirestore.allowedCategoryIds = allowedCategoryIds;
            }
            if (canSendNotifications !== undefined) {
            updatePayloadFirestore.canSendNotifications = canSendNotifications;
            }
        } else if (role === UserRole.SUPER_ADMIN) {
            updatePayloadFirestore.allowedCategoryIds = [];
            updatePayloadFirestore.canSendNotifications = true;
        }
      }

      // Firestore-г шинэчлэх (хэрэв өөрчлөлт байвал)
      if(Object.keys(updatePayloadFirestore).length > 1){
        await db
          .collection(ADMINS_COLLECTION)
          .doc(targetUserId)
          .update(updatePayloadFirestore);
      }

      return {
        success: true,
        message: "Admin details updated successfully in Auth and Firestore.",
      };
    } catch (error: unknown) {
      // 4. Алдааг зохицуулах
      logger.error("Error updating admin details:", error);
      let errorCode: HttpsError["code"] = "unknown";
      let errorMessage = "Failed to update admin details.";
      if (error && typeof error === "object" && "code" in error) {
        const firebaseErrorCode = (error as {code: string}).code;
        switch (firebaseErrorCode) {
          case "auth/email-already-exists":
            errorCode = "already-exists";
            errorMessage = "The new email address is already in use by another account.";
            break;
          case "auth/invalid-email":
            errorCode = "invalid-argument";
            errorMessage = "The new email address is not valid.";
            break;
          case "auth/user-not-found":
            errorCode = "not-found";
            errorMessage = "Target user not found in Firebase Authentication.";
            break;
          case "auth/weak-password":
            errorCode = "invalid-argument";
            errorMessage = "The new password is too weak.";
            break;
          default:
            errorCode = "internal";
            errorMessage = (error as unknown as Error).message || "An internal error occurred during update.";
        }
        throw new HttpsError(errorCode, errorMessage, {
          originalCode: firebaseErrorCode,
        });
      } else {
        errorMessage = (error as unknown as Error).message || "An unknown error occurred.";
        throw new HttpsError("internal", errorMessage);
      }
    }
  }
);

// Шинэ админ үүсгэх оролтын өгөгдлийн бүтэц
interface CreateAdminUserData {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  allowedCategoryIds?: string[];
  canSendNotifications?: boolean;
}

/**
 * Шинэ админ хэрэглэгч үүсгэх Cloud Function.
 * Эхлээд Firestore-д ийм админ байгаа эсэхийг шалгаад, дараа нь Auth-д үүсгэж,
 * эцэст нь Firestore-д админы профайлыг үүсгэдэг.
 */
export const createAdminUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateAdminUserData>) => {
    // 1. Нэвтрэлт болон Сүпер Админ эрхийг шалгах
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const callerUid = request.auth.uid;
    try {
      const callerAdminDoc = await db
        .collection(ADMINS_COLLECTION)
        .doc(callerUid)
        .get();
      if (
        !callerAdminDoc.exists ||
        callerAdminDoc.data()?.role !== UserRole.SUPER_ADMIN
      ) {
        throw new HttpsError(
          "permission-denied",
          "Caller does not have Super Admin privileges to create users."
        );
      }
    } catch (error) {
      logger.error("Error checking caller permissions for user creation:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError( "internal", "Could not verify caller permissions.");
    }

    const {email, password, name, role, allowedCategoryIds = [], canSendNotifications = false} = request.data;
    if (!email || !name || !role) {
      throw new HttpsError( "invalid-argument", "Missing required fields: email, name, and role.");
    }
    
    // 2. Firestore-ийн 'admins' коллекцид и-мэйл давхцаж байгаа эсэхийг шалгах
    const adminsRef = db.collection(ADMINS_COLLECTION);
    const existingAdminQuery = await adminsRef.where("email", "==", email).limit(1).get();
    if (!existingAdminQuery.empty) {
        throw new HttpsError("already-exists", `An admin with the email ${email} already exists.`);
    }

    let userRecord: admin.auth.UserRecord;
    let wasExistingUser = false;
    let newAuthUserUID: string | null = null;

    try {
        // 3. Firebase Auth-д хэрэглэгч байгаа эсэхийг шалгах, байхгүй бол шинээр үүсгэх
        try {
            userRecord = await fAuth.getUserByEmail(email);
            wasExistingUser = true; // Хэрэглэгч аль хэдийн Auth-д байсан
            if (name && userRecord.displayName !== name) {
                await fAuth.updateUser(userRecord.uid, { displayName: name });
            }
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Хэрэглэгч Auth-д байхгүй тул шинээр үүсгэх
                if (!password || password.length < 6) {
                    throw new HttpsError("invalid-argument", "Password must be at least 6 characters long for a new user.");
                }
                const photoURL = `https://placehold.co/100x100.png?text=${name.substring(0, 2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
                userRecord = await fAuth.createUser({ email, password, displayName: name, photoURL });
                newAuthUserUID = userRecord.uid; // Алдаа гарвал буцаахын тулд UID-г хадгалах
            } else {
                throw error; // Auth-аас өөр алдаа гарвал шууд шидэх
            }
        }

        // 4. Firestore-ийн 'admins' коллекцид админы мэдээллийг хадгалах
        const adminDocRef = db.collection(ADMINS_COLLECTION).doc(userRecord.uid);
        const firestoreAdminData = {
            uid: userRecord.uid,
            email: userRecord.email,
            name: name,
            role: role,
            avatar: userRecord.photoURL || `https://placehold.co/100x100.png?text=${name.substring(0, 2).toUpperCase()}&bg=FF5733&txt=FFFFFF`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            allowedCategoryIds: role === UserRole.SUB_ADMIN ? allowedCategoryIds : [],
            canSendNotifications: role === UserRole.SUPER_ADMIN ? true : canSendNotifications,
        };

        await adminDocRef.set(firestoreAdminData);

        const message = wasExistingUser 
            ? `Одоо байгаа хэрэглэгч ${name}-г админ болгож дэвшүүллээ.`
            : `Админ хэрэглэгч ${name} амжилттай үүслээ.`;

        return { success: true, message: message, userId: userRecord.uid };

    } catch (error: any) {
        logger.error("Error in createAdminUser process:", error);
      
        // Хэрэв Auth-д шинэ хэрэглэгч үүсгээд Firestore-д бичихэд алдаа гарвал, Auth-д үүсгэсэн хэрэглэгчийг буцааж устгах
        if (newAuthUserUID) {
            logger.warn(`Firestore operation failed. Rolling back Auth user creation for UID: ${newAuthUserUID}`);
            await fAuth.deleteUser(newAuthUserUID).catch(deleteError => {
                logger.error(`Failed to rollback (delete) new Auth user ${newAuthUserUID}:`, deleteError);
            });
        }

        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", error.message || "An unknown error occurred during the admin creation process.");
    }
  }
);


// Админ хэрэглэгч устгах оролтын өгөгдлийн бүтэц
interface DeleteAdminUserData {
  targetUserId: string;
}

/**
 * Админ хэрэглэгчийг Firebase Auth болон Firestore-оос устгах Cloud Function.
 */
export const deleteAdminUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<DeleteAdminUserData>) => {
    // 1. Нэвтрэлт болон Сүпер Админ эрхийг шалгах
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const callerUid = request.auth.uid;
    try {
      const callerAdminDoc = await db.collection(ADMINS_COLLECTION).doc(callerUid).get();
      if (!callerAdminDoc.exists || callerAdminDoc.data()?.role !== UserRole.SUPER_ADMIN) {
        throw new HttpsError("permission-denied", "Caller does not have Super Admin privileges to delete users.");
      }
    } catch (error) {
      logger.error("Error checking caller permissions for user deletion:", error);
      throw new HttpsError("internal", "Could not verify caller permissions.");
    }

    const {targetUserId} = request.data;
    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "targetUserId is required.");
    }
    if (callerUid === targetUserId) {
      throw new HttpsError("permission-denied", "You cannot delete your own account.");
    }

    try {
      const targetUserRecord = await fAuth.getUser(targetUserId);
      if (targetUserRecord.email === "admin@pro.com") {
        throw new HttpsError("permission-denied", "Cannot delete the primary super admin account.");
      }

      // 2. Auth-оос устгах
      await fAuth.deleteUser(targetUserId);
      
      // 3. Firestore-оос устгах
      await db.collection(ADMINS_COLLECTION).doc(targetUserId).delete();
      
      return { success: true, message: `Admin user ${targetUserRecord.displayName || targetUserRecord.email} has been deleted successfully.` };
    } catch (error: any) {
      // 4. Алдааг зохицуулах (жишээ нь, Auth-д байхгүй ч Firestore-д байвал)
      logger.error(`Error deleting admin user ${targetUserId}:`, error);
      if (error.code === "auth/user-not-found") {
        try {
           await db.collection(ADMINS_COLLECTION).doc(targetUserId).delete();
           return { success: true, message: "User not found in Auth, but Firestore document deleted." };
        } catch (firestoreError: any) {
          logger.error(`Error deleting Firestore document for non-auth user ${targetUserId}:`, firestoreError);
          throw new HttpsError("internal", `Failed to delete user: ${firestoreError.message}`);
        }
      }
      throw new HttpsError("internal", `Failed to delete user: ${error.message}`);
    }
  }
);

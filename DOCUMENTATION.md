# Админ Про Төслийн Бичиг Баримт

Энэхүү баримт бичиг нь "Админ Про" контент удирдах системийн бүтэц, зорилго, ашигласан технологийн талаарх дэлгэрэнгүй мэдээллийг агуулна.

---

## 1. Төслийн Ерөнхий Тойм

### 1.1. Төслийн Зорилго ба Асуудал Шийдэлт

**Админ Про** нь **"Mongol App"**-д зориулсан контент удирдах систем (CMS) юм. Энэхүү вэб админ нь "Mongol App"-ийн бүх төрлийн контентыг удирдах, хэрэглэгчид рүү push notification илгээх, аппын нэмэлт тохиргоог хялбархан зохицуулах боломжийг олгодог орчин үеийн, уян хатан платформ юм.

**Гол шийдэж буй асуудлууд:**

*   **Динамик Контент Удирдлага:** "Ангилал" (Category) үүсгэх замаар ямар ч төрлийн өгөгдлийн бүтцийг (жишээ нь, блог, бүтээгдэхүүн, үйлчилгээ, зар) удирдах боломжтой. Энэ нь кодонд өөрчлөлт оруулахгүйгээр "Mongol App" дотор шинэ төрлийн контент нэмэх боломжийг олгодог.
*   **Хэрэглэгчийн Оролцоог Нэмэгдүүлэх:** Админы самбараас "Mongol App"-ийн сонгосон хэрэглэгчид рүү шууд эсвэл товлосон цагт push notification илгээх боломжтой.
*   **Админы Эрхийн Удирдлага:** "Сүпер Админ" болон "Дэд Админ" гэсэн хоёр төрлийн эрхээр хэрэглэгчдийн хандалтыг удирдах боломжтой. Дэд админд зөвхөн тодорхой ангиллыг удирдах эрх олгох боломжтой.
*   **Төвлөрсөн Удирдлага:** Баннер, хотын жагсаалт, тусламжийн цэс зэрэг "Mongol App"-ийн бусад нэмэлт тохиргоог нэг дороос удирдах боломжийг олгоно.

### 1.2. Технологийн Стек (Technology Stack)

Энэхүү төсөл нь орчин үеийн, найдвартай технологиуд дээр суурилсан.

*   **Frontend (Нүүр тал):**
    *   **Next.js:** React-д суурилсан, сервер талын рендэринг (SSR) болон статик сайт үүсгэх (SSG) боломжтой, продакшнд зориулсан фрэймворк.
    *   **React:** Хэрэглэгчийн интерфейс бүтээхэд зориулсан сан.
    *   **TypeScript:** Кодын чанар, уншигдах байдлыг сайжруулдаг, JavaScript-ийн хүчирхэг төрлийн давхарга.
    *   **Tailwind CSS:** Загварчлалыг хурдан, цэгцтэй хийхэд зориулсан CSS фрэймворк.
    *   **ShadCN UI:** Дахин ашиглагдах боломжтой, загварлаг UI компонентуудын цуглуулга.

*   **Backend (Арын тал) ба Мэдээллийн Сан:**
    *   **Firebase:** Google-ийн хөгжүүлсэн, цогц платформ.
        *   **Firebase Authentication:** Хэрэглэгчийн нэвтрэлт, бүртгэлийг удирдах үйлчилгээ.
        *   **Firestore:** NoSQL төрлийн, уян хатан, бодит цагийн мэдээллийн сан.
        *   **Firebase Storage:** Зураг, файл зэрэг медиа хадгалах үйлчилгээ.
        *   **Firebase Cloud Functions:** Сервер талын логикийг (жишээ нь, notification илгээх) ажиллуулах үйлчилгээ.
        *   **Firebase Cloud Messaging (FCM):** Push notification илгээх үйлчилгээ.

*   **Хиймэл Оюун (AI):**
    *   **Genkit (Google AI):** Google-ийн Gemini зэрэг хиймэл оюуны моделиудыг ашиглан текст үүсгэх, контент санал болгох зэрэг үйлдлийг хийхэд зориулсан хэрэгсэл.

---

## 2. Төслийн Бүтэц

Энэхүү төсөл нь Next.js-ийн `src` директорын зохион байгуулалтыг дагаж мөрддөг. Гол хавтаснуудын үүрэг:

*   **`/` (Root хавтас):** Төслийн үндсэн тохиргооны файлууд байрлана. (`next.config.js`, `package.json`, `tailwind.config.ts`, `firebase.json` гэх мэт).

*   **`/src`:** Аппликейшны бүх эх код энд төвлөрнө.
    *   **`/app`:** Next.js-ийн App Router-д суурилсан хуудас, замчлалын гол хэсэг. Админ панелийн хуудаснууд (`/admin` дотор) болон үндсэн `layout.tsx`, `page.tsx` файлууд энд байрлана.
    *   **`/components`:** Дахин ашиглагдах боломжтой React компонентууд.
        *   **`/ui`:** `ShadCN UI`-аас үүсгэсэн үндсэн UI компонентууд (Товч, Карт, Талбар г.м).
        *   **`/admin`:** Зөвхөн админ панельд зориулсан тусгай компонентууд (`PageHeader`, `ImageUploader` г.м).
    *   **`/lib`:** Аппликейшны гол логик, туслах функцүүд.
        *   **`/actions`:** Сервер талд (Server Actions) ажиллаж, мэдээллийн сантай харьцдаг функцүүд.
        *   **`/firebase.ts`:** Firebase-ийн тохиргоог эхлүүлдэг файл.
        *   **`/utils.ts`:** Түгээмэл хэрэглэгддэг туслах функцүүд.
    *   **`/contexts`:** React Context-ууд. Жишээ нь, `AuthContext` нь хэрэглэгчийн нэвтрэлтийн мэдээллийг апп даяар дамжуулдаг.
    *   **`/hooks`:** Custom React hook-ууд (`useAuth`, `useToast`).
    *   **`/types`:** TypeScript-ийн төрлийн тодорхойлолтууд (`interface`, `enum`).
    *   **`/ai`:** Genkit ашигласан хиймэл оюуны функцүүд.

*   **`/functions`:** Firebase Cloud Functions-д зориулсан backend код. Энэ нь Next.js-ийн аппаас тусдаа, бие даасан Node.js орчинд ажилладаг.

---

## 3. Тохиргооны Файлууд

Төслийн зөв, тогтвортой ажиллагааг хангах хэд хэдэн чухал тохиргооны файлууд бий.

*   **`.env`:** (Эсвэл `.env.local`) Энэ файлд Firebase-ийн API түлхүүр зэрэг нууцлалтай, орчноос хамааралтай хувьсагчдыг хадгална. Энэ файл нь аюулгүй байдлын үүднээс Git-д commit хийгдэхгүй. Vercel дээр байршуулахдаа эдгээр хувьсагчдыг Vercel-ийн Environment Variables хэсэгт гараар тохируулж өгөх шаардлагатай.

*   **`firebase.json`:** Firebase-ийн үйлчилгээнүүдийн тохиргоог агуулна.
    *   `firestore.rules`: Firestore мэдээллийн санд хандах эрхийн дүрмийг агуулсан файлыг заана.
    *   `functions`: Cloud Function-ийн тохиргоог тодорхойлно. `source` нь функцийн код байрлах хавтасыг (`functions`), `predeploy` нь функц байршуулахын өмнө ажиллах коммандыг (`npm run build`) заана.

*   **`next.config.js`:** Next.js аппликейшны үндсэн тохиргоог хийдэг файл.
    *   `images.remotePatterns`: Аппликейшн дотор `next/image` ашиглан харуулахыг зөвшөөрсөн гаднын серверүүдийн (жишээ нь, `placehold.co`, `firebasestorage.googleapis.com`) домайн нэрсийг энд тодорхойлно.

*   **`package.json`:** Төслийн "тархи" гэж хэлж болно.
    *   `scripts`: `npm run dev`, `npm run build` зэрэг түгээмэл ашиглагддаг коммандуудыг тодорхойлно.
    *   `dependencies`: Аппликейшны ажиллахад шаардлагатай сангуудыг (`next`, `react`, `firebase`, `lucide-react` гэх мэт) жагсаана.
    *   `devDependencies`: Зөвхөн хөгжүүлэлтийн үед шаардлагатай сангуудыг (`typescript`, `tailwindcss` гэх мэт) жагсаана.

*   **`tailwind.config.ts`:** Tailwind CSS-ийн тохиргооны файл.
    *   `theme.extend`: Аппликейшны өнгөний схем (`primary`, `secondary`, `background` гэх мэт), фонт (`Space Grotesk`, `Inter`), сүүдэр, бусад загварын тохиргоог `globals.css`-д тодорхойлсон HSL хувьсагчидтай уялдуулан энд оруулна.

*   **`tsconfig.json`:** TypeScript хөрвүүлэгчийн тохиргоог агуулдаг.
    *   `compilerOptions.paths`: `@/*` гэх мэт товчлол ашиглан файлыг import хийх замыг тодорхойлно (`@/components` нь `src/components` гэсэн үг). Энэ нь кодын цэгцийг сайжруулдаг.

*   **`components.json`:** `shadcn/ui` компонентуудыг нэмэх, удирдах үед ашиглагддаг тохиргооны файл.
    *   `aliases`: `shadcn/ui` компонентууд хаана байрлах, `utils` зэрэг туслах функцүүдийг аль замаас авахыг зааж өгдөг.

*   **`vercel.json`:** Төслийг Vercel платформ дээр байршуулахад зориулсан тохиргоог агуулна. Орчин үеийн Next.js төслүүдэд энэ файл ихэвчлэн хоосон байдаг бөгөөд Vercel тохиргоог автоматаар таньдаг.

---

## 4. Backend (Cloud Functions)

Төслийн backend логик нь Firebase Cloud Functions ашиглан хийгдсэн бөгөөд `functions` хавтаст төвлөрсөн. Эдгээр функц нь клиент талаас шууд хийх боломжгүй, аюулгүй байдлын үүднээс сервер дээр хийгдэх ёстой үйлдлүүдийг (жишээ нь, админ хэрэглэгч үүсгэх, мэдэгдэл илгээх) хариуцдаг.

### 4.1. Хавтасны Бүтэц

*   **/functions (Root хавтас):**
    *   `package.json`: Cloud Function-д шаардлагатай сангууд (`firebase-admin`, `firebase-functions`) болон скриптүүдийг тодорхойлно.
    *   `tsconfig.json`: Функцийн TypeScript тохиргоог агуулна.

*   **/functions/src:**
    *   `index.ts`: **Хамгийн чухал файл.** Бүх backend логик энд бичигдэнэ. `onCall` ашиглан клиент талаас дуудах боломжтой функцүүдийг (`sendNotification`, `createAdminUser`, `updateAdminAuthDetails`, `deleteAdminUser`) тодорхойлж өгдөг. Эдгээр функц нь Firebase Admin SDK ашиглан Firestore болон Authentication-тай шууд харьцдаг.
    *   `types.ts`: Зөвхөн функцийн орчинд хэрэглэгдэх TypeScript төрлүүдийг (`UserRole` гэх мэт) тодорхойлж, frontend-ийн төрлөөс тусгаарлаж өгдөг.

*   **/functions/lib:**
    *   Энэ хавтас нь таны бичсэн TypeScript (`.ts`) кодоос хөрвүүлэгдсэн, сервер дээр ажиллах JavaScript (`.js`) файлуудыг агуулдаг. Firebase нь эндэх файлуудыг л ашиглан функцийг ажиллуулдаг.

### 4.2. Гол Логик

*   **Callable Functions:** Клиент тал (Next.js апп) нь Firebase SDK ашиглан энд тодорхойлсон функцүүдийг нэрээр нь дуудаж ажиллуулдаг. Энэ нь аюулгүй байдлыг хангаж, зөвхөн нэвтэрсэн, эрхтэй хэрэглэгч тодорхой үйлдлийг хийх боломжийг олгодог.
*   **Admin SDK:** Функцүүд нь `firebase-admin` санг ашигладаг. Энэ нь энгийн клиент SDK-аас илүү өндөр эрхтэй бөгөөд хэрэглэгч үүсгэх, устгах, ямар ч өгөгдлийг уншиж бичих зэрэг үйлдлийг хийх чадвартай.

---

## 5. Frontend (Next.js App)

Програмын нүүр тал (Frontend) нь **Next.js** фрэймворк дээр суурилсан бөгөөд `src` хавтас дотор төвлөрсөн. Энэ нь орчин үеийн, цэгцтэй кодын зохион байгуулалтыг бий болгодог.

### 5.1. `/src` Хавтасны Бүтэц

*   **`/app`:** Next.js-ийн App Router-ийн үндсэн хэсэг. Админ панелийн хуудаснууд, замчлал (routing), хуудасны ерөнхий бүтэц (layout) энд тодорхойлогдоно.
    *   `/admin`: Админы бүх хуудас (`/dashboard`, `/users`, `/categories` г.м.) энд байрлана. Хуудас бүр өөрийн `page.tsx` файлтай, шаардлагатай бол `layout.tsx`, `loading.tsx` файлуудтай байна.
    *   `layout.tsx`: Үндсэн (root) layout. Бүх хуудсанд нөлөөлөх HTML бүтцийг тодорхойлно.
    *   `page.tsx`: Нэвтрэх хуудас.

*   **`/components`:** Дахин ашиглагдах боломжтой React компонентууд.
    *   `/ui`: **ShadCN UI**-аас үүсгэсэн үндсэн UI компонентууд (Товч, Карт, Талбар г.м). Энэ хавтасны компонентууд нь ерөнхий зориулалттай.
    *   `/admin`: Зөвхөн админ панельд зориулсан тусгай компонентууд (`PageHeader`, `ImageUploader`, `SidebarNav` г.м).

*   **`/lib`:** Аппликейшны гол логик, туслах функцүүд.
    *   `/actions`: **Server Actions**. Сервер талд ажиллаж, мэдээллийн сантай шууд харьцдаг (өгөгдөл нэмэх, засах, устгах) асинхрон функцүүд.
    *   `/firebase.ts`: Firebase-ийн тохиргоог эхлүүлж, `auth`, `db`, `storage` зэрэг үйлчилгээний объектуудыг экспортлодог файл.
    *   `/utils.ts`: Түгээмэл хэрэглэгддэг туслах функцүүд (жишээ нь, `cn` - class нэгтгэгч, `slugify` - URL-д ээлтэй текст үүсгэгч).

*   **`/contexts`:** React Context-ууд.
    *   `AuthContext.tsx`: Хэрэглэгчийн нэвтрэлтийн төлөвийг (хэн нэвтэрсэн, ямар эрхтэй гэх мэт) апп даяар дамжуулж, удирдах үүрэгтэй. Энэ нь клиент талын бүх компонент нэвтэрсэн хэрэглэгчийн мэдээлэлд хандах боломжийг олгодог.

*   **`/hooks`:** Custom React hook-ууд.
    *   `useAuth.ts`: `AuthContext`-ийн мэдээллийг хялбархан авах боломжийг олгодог hook.
    *   `useToast.ts`: Апп даяар мэдэгдэл (toast notification) харуулахад хэрэглэгдэнэ.

*   **`/types`:** TypeScript-ийн төрлийн тодорхойлолтууд.
    *   `index.ts`: `UserProfile`, `Category`, `Entry` зэрэг аппликейшны өгөгдлийн бүтцүүдийг `interface`, `enum` ашиглан тодорхойлно. Энэ нь кодын алдааг багасгаж, найдвартай байдлыг нэмэгдүүлдэг.

*   **`/ai`:** Хиймэл оюуны (Genkit) логик.
    *   `/flows`: Genkit ашиглан тодорхойлсон flow-ууд. Жишээлбэл, контент санал болгох, текст үүсгэх зэрэг хиймэл оюуны үйлдлүүд энд байрлана.
    *   `genkit.ts`: Genkit-ийн үндсэн тохиргоог хийдэг файл.

---

## 6. Deployment (Байршуулалт)

Энэхүү төслийг продакшн орчинд байршуулахдаа frontend (Next.js) болон backend (Firebase Cloud Functions) хоёрыг тусад нь байршуулна.

### 6.1. Frontend (Vercel дээр байршуулах)

Next.js аппликейшныг байршуулахад **Vercel** платформ хамгийн тохиромжтой.

1.  **Vercel данс үүсгэх:** Хэрэв байхгүй бол [vercel.com](https://vercel.com/) дээр данс нээнэ.
2.  **GitHub репозиторитой холбох:** Vercel дээр шинэ төсөл үүсгэж, өөрийн GitHub данстай холбон, энэхүү "Админ Про" төслийн репозиторийг сонгоно.
3.  **Орчны хувьсагчдыг (Environment Variables) тохируулах:**
    *   Энэ бол хамгийн чухал алхам. Таны локал дээрх `.env` файлд байгаа бүх нууц хувьсагчдыг (жишээ нь, `NEXT_PUBLIC_FIREBASE_API_KEY`) Vercel төслийн **Settings -> Environment Variables** хэсэгт нэг бүрчлэн хуулж оруулах шаардлагатай. Vercel нь таны `.env` файлыг уншихгүй.
4.  **Deploy хийх:** Дээрх тохиргоог хийсний дараа **Deploy** товчийг дарна. Vercel нь Next.js төслийг автоматаар таньж, build хийж, байршуулна. Таны `main` (эсвэл `master`) branch-д push хийх болгонд Vercel автоматаар шинэ хувилбарыг байршуулна.

### 6.2. Backend (Firebase Cloud Functions)

Сервер талын логик болох Cloud Functions-г Firebase дээр байршуулна.

1.  **Firebase CLI суулгах:** Хэрэв суулгаагүй бол `npm install -g firebase-tools` коммандаар суулгана.
2.  **Firebase-д нэвтрэх:** Терминал дээр `firebase login` коммандыг ажиллуулж, өөрийн Google дансаар нэвтэрнэ.
3.  **Зөв төсөл сонгох:** `firebase use <project-id>` коммандаар өөрийн Firebase төслийн ID-г оруулан сонгоно. (`<project-id>` хэсгийг `mbad-c532e` гэх мэтээр солино).
4.  **Функц байршуулах:** Төслийн үндсэн хавтаст (root) байрлаж байгаад дараах коммандыг ажиллуулна:
    ```bash
    firebase deploy --only functions
    ```
    Энэ комманд нь `functions` хавтас доторх кодыг build хийж (`npm run build` скриптийг ажиллуулсны дараа) Firebase Cloud Functions үйлчилгээнд байршуулна.

5.  **Функцийн Environment Variables:** Хэрэв таны функц ямар нэгэн нууц түлхүүр ашигладаг бол (одоогийн байдлаар тийм зүйл бага), түүнийг `firebase functions:config:set service.key="secret-value"` гэх мэт коммандаар тохируулж өгдөг.

---

## 7. Хөгжүүлэлт болон Хувилбарын Удирдлага

Энэ хэсэгт төслийн хөгжүүлэлтийн урсгал, кодын чанарыг хангах хэрэгслүүд болон хувилбарын удирдлагын талаар тайлбарлана.

### 7.1. Түгээмэл Скриптүүд (`package.json`)

`package.json` файлын `scripts` хэсэгт тодорхойлсон коммандууд нь хөгжүүлэлтийн үйл явцыг хялбарчилдаг.

*   `npm run dev`: Хөгжүүлэлтийн серверийг Next.js-ийн Turbopack-тай хамт асаана. Энэ нь код өөрчлөгдөх бүрт автоматаар шинэчлэгддэг (Hot Reload).
*   `npm run build`: Продакшнд зориулсан, оптимизаци хийгдсэн хувилбарыг үүсгэнэ. Vercel дээр байршуулах үед энэ комманд автоматаар ажилладаг.
*   `npm run start`: `build` хийсний дараа продакшн серверийг ажиллуулна.
*   `npm run lint`: ESLint ашиглан кодын алдаа, стилийн зөрчлийг шалгана.

### 7.2. Кодын Чанар (ESLint & TypeScript)

*   **ESLint:** `.eslintrc.js` файлд тохируулсан дүрмийн дагуу кодын алдаа, боломжит асуудлуудыг илрүүлж, засах сануулга өгдөг. Энэ нь багийн гишүүд нэгдсэн кодын стандарт мөрдөхөд тусалдаг.
*   **TypeScript:** `tsconfig.json` файлд тохируулга нь хийгдсэн. TypeScript нь JavaScript дээр төрлийн систем (type system) нэмж өгснөөр кодын алдааг эрт илрүүлэх, уншигдах чадварыг сайжруулах, найдвартай байдлыг нэмэгдүүлэх ач холбогдолтой. `paths` тохиргоо нь `@/components` гэх мэт товч замыг ашиглах боломжийг олгодог.

### 7.3. Загварчлал (Tailwind CSS & ShadCN UI)

*   **Tailwind CSS:** `tailwind.config.ts` болон `src/app/globals.css` файлуудад тохиргоо нь хийгдсэн. Энэ нь utility-first аргачлалаар HTML дотор классууд бичиж, хурдан хугацаанд загварчлал хийх боломжийг олгодог. Өнгө, фонт зэрэг үндсэн загварын тохиргоог `globals.css`-д HSL хувьсагч ашиглан төвлөрүүлж, `tailwind.config.ts`-д өргөтгөсөн.
*   **ShadCN UI:** `components.json`-оор удирдуулдаг. Энэ нь урьдчилан бэлдсэн, дахин ашиглах боломжтой, загварлаг UI компонентуудын цуглуулга юм. `shadcn-ui` коммандаар шинэ компонент нэмэхэд тохиргоог энэ файлаас уншина.

### 7.4. Хувилбарын Удирдлага (Git & GitHub)

*   **Git:** Кодын өөрчлөлт бүрийг мөшгиж, хувилбаруудыг удирдах систем.
*   **`.gitignore`:** Git-д commit хийх шаардлагагүй файлуудыг (жишээ нь, `node_modules`, `.env`, `firestore-debug.log`) үл тоомсорлох тохиргоог агуулдаг. Энэ нь репозиторийг цэвэрхэн, аюулгүй байлгахад чухал үүрэгтэй.

---

## 8. Хиймэл Оюун (AI)

Энэ хэсэгт Genkit ашиглан хиймэл оюуныг хэрхэн нэгтгэсэн талаар тайлбарлана.

### 8.1. Genkit Integration

Энэхүү төсөл нь Google-ийн **Genkit** хэрэгслийг ашиглан хиймэл оюуны функцүүдийг нэгтгэсэн. Genkit нь Gemini зэрэг дэвшилтэт хиймэл оюуны моделиудыг ашиглан текст үүсгэх, контент санал болгох зэрэг үйлдлүүдийг хийх боломжийг олгодог.

**Гол зохион байгуулалт:**

*   **`/src/ai`:** Хиймэл оюунтай холбоотой бүх логик энэ хавтаст төвлөрнө.
    *   **`genkit.ts`:** Genkit-ийн үндсэн тохиргоог хийж, ашиглах `plugin` (жишээ нь, `googleAI`) болон `model` (жишээ нь, `gemini-pro`)-г тодорхойлдог файл.
    *   **`/flows`:** Тухайн хиймэл оюуны гүйцэтгэх ажлыг (flow) тодорхойлсон файлууд энд байрлана. Жишээлбэл, `suggest-content-on-schedule.ts` файл нь оруулсан контентод дүн шинжилгээ хийж, сайжруулах санал болгодог `flow`-г агуулдаг.

**Ажиллах зарчим:**

1.  **Flow тодорхойлох:** `/src/ai/flows` хавтас дотор `ai.defineFlow` ашиглан тодорхой нэг үйлдлийг (жишээ нь, контент санал болгох) хийдэг функцийг тодорхойлно. Энэ нь оролт, гаралтын `schema`-г `zod` ашиглан тодорхойлдог.
2.  **Prompt үүсгэх:** `ai.definePrompt` ашиглан хиймэл оюуны загварт өгөх зааварчилгааг (prompt) бэлтгэнэ. Энэ нь оролтын өгөгдлийг ашиглан динамик `prompt` үүсгэдэг.
3.  **Дуудах:** Frontend-ийн хэсгээс (жишээ нь, Server Action эсвэл client-side component) эдгээр `flow`-г дуудаж, үр дүнг нь хэрэглэгчид харуулна.

Энэхүү бүтэц нь хиймэл оюуны логикийг үндсэн аппликейшны кодоос тусгаарлаж, удирдах, хөгжүүлэхэд хялбар болгодог.

---

## 9. Хөгжүүлэгчийн заавар

Энэ хэсэгт төслийг локал орчинд хэрхэн ажиллуулах, Firebase холболтыг тохируулах, түгээмэл ашиглагддаг командууд болон бусад хөгжүүлэлтийн зааврыг багтаав.

### 9.1. Локал орчинд ажиллуулах

Төслийг өөрийн компьютерт амжилттай ажиллуулахын тулд дараах алхмуудыг дагана уу.

1.  **Репозиторийг хуулж авах:**
    ```bash
    git clone https://github.com/global-vision-developer/AdminPro.git
    cd AdminPro
    ```

2.  **Шаардлагатай сангуудыг суулгах:**
    Төслийн үндсэн хавтаст болон `functions` хавтаст шаардлагатай бүх сангуудыг суулгана.
    ```bash
    # Үндсэн аппликейшны сангуудыг суулгах
    npm install

    # Cloud Functions-ийн сангуудыг суулгах
    cd functions
    npm install
    cd ..
    ```

3.  **`.env` файлыг тохируулах:**
    Төслийн үндсэн хавтаст `.env` нэртэй шинэ файл үүсгэж, Firebase төслийнхөө тохиргоог доорх жишээний дагуу оруулна уу (9.2 хэсгийг харна уу). Энэ файлгүйгээр аппликейшн Firebase-тэй холбогдож чадахгүй.

4.  **Хөгжүүлэлтийн серверыг асаах:**
    Энэ комманд нь Next.js-ийн хөгжүүлэлтийн серверыг `http://localhost:9003` хаяг дээр асаана.
    ```bash
    npm run dev
    ```

5.  **Firebase эмуляторыг ажиллуулах (заавал биш):**
    Хэрэв та Cloud Functions-г локал орчинд туршихыг хүсвэл Firebase эмуляторыг ашиглаж болно.
    ```bash
    # Firebase CLI ашиглан эмуляторыг асаах
    firebase emulators:start
    ```

### 9.2. `.env` Файлын жишээ

Төслийн үндсэн хавтаст `.env` файлыг үүсгэж, Firebase Console-оос авсан өөрийн төслийн тохиргоог доорх загварын дагуу оруулна уу.

```env
# Firebase Configuration
# Firebase Console > Project settings > General > Your apps > Web app > SDK setup and configuration хэсгээс авна уу.
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
```
Эдгээр утгыг зөв оруулснаар таны локал аппликейшн Firebase-тэй холбогдож ажиллах боломжтой болно.

### 9.3. Түгээмэл NPM командууд

`package.json` файлд тодорхойлсон дараах командууд нь хөгжүүлэлтийг хөнгөвчилнө.

*   `npm run dev`: Next.js-ийн хөгжүүлэлтийн серверыг `localhost:9003` дээр асаана. Код өөрчлөгдөх бүрт автоматаар шинэчлэгдэнэ.
*   `npm run build`: Продакшн орчинд зориулсан, оптимизац хийгдсэн хувилбарыг үүсгэнэ.
*   `npm run start`: `build` хийсний дараа продакшн серверийг ажиллуулна.
*   `npm run lint`: ESLint ашиглан кодын алдаа, стилийн зөрчлийг шалгана.

**Cloud Functions (`functions/` хавтас доторх):**

*   `npm run build`: Функцийн TypeScript кодыг JavaScript рүү хөрвүүлж, `lib` хавтаст байрлуулна.
*   `npm run deploy`: Функцийг Firebase-д байршуулна.

---

## 10. Нэмэлт

Энэ хэсэгт төсөлтэй холбоотой түгээмэл асуултууд болон ирээдүйд хийж болох боломжит сайжруулалтуудыг жагсаав.

### 10.1. Түгээмэл Асуулт (FAQ)

**А: Шинэ админ хэрэглэгч нэмсний дараа нэвтэрч чадахгүй байна. Яагаад?**
**Х:** Үүний хэд хэдэн шалтгаан бий:
1.  **Firebase Authentication:** Хэрэглэгч зөвхөн Firestore-д биш, Firebase Authentication хэсэгт үүссэн эсэхийг шалгаарай.
2.  **Нууц үг:** Хэрэглэгчид өгсөн нууц үг зөв эсэхийг шалгаарай. Шаардлагатай бол нууц үг сэргээх и-мэйл илгээж болно.
3.  **И-мэйл баталгаажуулалт:** Хэрэв танай төслийн Firebase тохиргоо и-мэйл баталгаажуулалт шаарддаг бол хэрэглэгч и-мэйл хаягаа баталгаажуулсан байх ёстой.

**А: Cloud Function deploy хийхэд алдаа заагаад байна. Яах вэ?**
**Х:** Түгээмэл алдаанууд ба шийдлүүд:
1.  **Billing:** Firebase төслийн төлбөрийн төлөвлөгөө нь "Blaze (Pay as you go)" байх ёстой. Үнэгүй "Spark" төлөвлөгөө нь Cloud Functions-г дэмждэггүй.
2.  **Node.js хувилбар:** `functions/package.json` файлын `engines` хэсэгт заасан Node.js хувилбар таны орчинд тохирч байгаа эсэхийг шалгаарай (одоогийн байдлаар "20").
3.  **Алдааны log:** Терминал дээрх алдааны дэлгэрэнгүй мэдээллийг уншиж, Firebase Console-ийн Functions хэсгийн Logs-г шалгаарай.

**А: Дэд админ зарим нэг категорид хандаж чадахгүй байна.**
**Х:** Сүпер админ нь **Админ Удирдлага > Хэрэглэгчид** хэсгээс тухайн дэд админыг сонгож, "Зөвшөөрсөн категориуд" хэсэгт хандах ёстой категориудыг нь оноож өгсөн эсэхийг шалгаарай.

### 10.2. Боломжит Сайжруулалтууд

Эдгээр нь төслийг ирээдүйд өргөжүүлэх, сайжруулах боломжтой санаанууд юм.

*   **Аудит Лог (Audit Log):** Админууд ямар өөрчлөлт (үүсгэх, засах, устгах) хийснийг бүртгэдэг дэлгэрэнгүй түүхийн систем нэмэх. Энэ нь хяналт, аюулгүй байдлыг сайжруулна.
*   **Дэшбордын Сайжруулалт:** График, статистик мэдээллийг илүү баяжуулж, контентын хандалт, хэрэглэгчийн идэвх зэргийг харуулдаг болох.
*   **Контент Хувилбарлах (Content Versioning):** Бүртгэл (entry) бүрийн өөрчлөлтийн түүхийг хадгалж, өмнөх хувилбарыг сэргээх боломжтой болгох.
*   **Хоёр хүчин зүйлийн нэвтрэлт (Two-Factor Authentication - 2FA):** Админы нэвтрэлтийн аюулгүй байдлыg нэмэгдүүлэхийн тулд 2FA нэвтрүүлэх.
*   **Илүү дэвшилтэт хайлт, шүүлтүүр:** Жагсаалт бүр дээр (хэрэглэгч, категори, бүртгэл) илүү олон талбараар шүүх, нарийвчилсан хайлт хийх боломжийг нэмэх.
*   **Тест бичих (Automated Testing):** Jest, React Testing Library зэрэг хэрэгслүүд ашиглан нэгж (unit) болон интеграцийн (integration) тестүүд бичиж, кодын найдвартай байдлыг хангах.
```
- apphosting.yaml:
```yaml
# Settings to manage and configure a Firebase App Hosting backend.
# https://firebase.google.com/docs/app-hosting/configure

runConfig:
  # Increase this value if you'd like to automatically spin up
  # more instances in response to increased traffic.
  maxInstances: 1

```
- components.json:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```
- firebase.json:
```json

{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ],
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR\" run build"
      ]
    }
  ]
}

```
- firestore.indexes.json:
```json

{
  "indexes": [],
  "fieldOverrides": []
}

```
- functions/.eslintrc.js:
```js
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "max-len": "off", // Disable max-len rule
  },
};

```
- functions/package.json:
```json

{
  "name": "functions",
  "scripts": {
    "lint": "eslint --ext .js,.ts .",
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions --project=mbad-c532e",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "20"
  },
  "main": "lib/index.js",
  "dependencies": {
    "dotenv": "^16.5.0",
    "firebase-admin": "^12.6.0",
    "firebase-functions": "^6.0.1"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^5.62.0",
    "@typescript-eslint/parser": "^5.62.0",
    "eslint": "^8.57.1",
    "eslint-config-google": "^0.14.0",
    "eslint-plugin-import": "^2.31.0",
    "firebase-functions-test": "^3.1.0",
    "typescript": "^5.1.6"
  },
  "private": true
}

```
- functions/src/index.ts:
```ts
/**
 * @fileoverview This file contains the backend logic for the application, implemented as
 * Google Cloud Functions for Firebase. These functions handle protected operations
 * that require admin privileges, such as sending notifications, creating/updating/deleting
 * admin users, and other server-side tasks. They are called from the client-side
 * actions using the Firebase SDK.
 */
// functions/src/index.ts
import * as dotenv from "dotenv";
import * as path from "path";

// For local development, load environment variables from the root .env file
if (process.env.FUNCTIONS_EMULATOR) {
  dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
}

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

export const sendNotification = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<SendNotificationPayload>) => {
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

      // Scheduling logic
      if (scheduleAt && new Date(scheduleAt).getTime() > Date.now()) {
        const scheduledLog: NotificationLog = {
          title,
          body,
          imageUrl: imageUrl || null,
          deepLink: deepLink || null,
          adminCreator,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          targets: [], // Targets will be processed by a separate scheduled function
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

      // Fetch latest user data to get fresh FCM tokens
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
            ...(imageUrl && { image: imageUrl }), // Use 'image' for the web standard
            icon: "https://placehold.co/96x96.png?text=AP&bg=FF5733&txt=FFFFFF",
            badge: "https://placehold.co/96x96.png?text=AP&bg=FF5733&txt=FFFFFF",
          },
        },
        android: {
          priority: "high",
          notification: {
            channel_id: "default_channel"
          }
        },
        tokens: tokensToSend,
        data: dataPayloadForFCM,
      };

      logger.info(`Sending ${tokensToSend.length} messages.`);
      const response = await messaging.sendEachForMulticast(messagePayload);
      const currentTimestamp = admin.firestore.Timestamp.now();

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

// --- V2 Callable Function: Update Admin User Details ---
const ADMINS_COLLECTION = "admins";

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

export const updateAdminAuthDetails = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<UpdateAdminUserData>) => {
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

    // Get caller's role for permission checks
    const callerAdminDoc = await db.collection(ADMINS_COLLECTION).doc(callerUid).get();
    if (!callerAdminDoc.exists) {
        throw new HttpsError("permission-denied", "Caller is not a valid admin.");
    }
    const isCallerSuperAdmin = callerAdminDoc.data()?.role === UserRole.SUPER_ADMIN;

    // --- PERMISSION CHECKS ---
    // If not a super admin, can only edit self, and only limited fields.
    if (!isCallerSuperAdmin) {
        if (!isEditingSelf) {
            throw new HttpsError("permission-denied", "You do not have permissions to edit other users.");
        }
        // Sub-admins can't change email, password, role, or permissions for themselves
        if (email || newPassword || role || allowedCategoryIds !== undefined || canSendNotifications !== undefined) {
             throw new HttpsError("permission-denied", "You can only update your name and avatar.");
        }
    }
    
    // Super-admin specific checks (e.g. protecting the main super admin account)
    if (isCallerSuperAdmin) {
        try {
            const targetUserRecord = await fAuth.getUser(targetUserId);
            if (
                targetUserRecord.email === "super@example.com" &&
                (email && email !== "super@example.com" || role && role !== UserRole.SUPER_ADMIN)
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
      // Prepare Auth update payload
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

      // Update Auth if there's anything to update
      if (Object.keys(updatePayloadAuth).length > 0) {
        await fAuth.updateUser(targetUserId, updatePayloadAuth);
        logger.info(
          `Successfully updated Firebase Auth for user: ${targetUserId}`,
          updatePayloadAuth
        );
      }

      // Prepare Firestore update payload
      const updatePayloadFirestore: Record<string, any> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (email) updatePayloadFirestore.email = email;
      if (name) updatePayloadFirestore.name = name;
      if (avatar) updatePayloadFirestore.avatar = avatar;
      
      // Only allow role/permission changes if the caller is a Super Admin
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

      // Update Firestore if there is more than just the timestamp
      if(Object.keys(updatePayloadFirestore).length > 1){
        await db
          .collection(ADMINS_COLLECTION)
          .doc(targetUserId)
          .update(updatePayloadFirestore);
        logger.info(
          `Successfully updated Firestore for user: ${targetUserId}`,
          updatePayloadFirestore
        );
      }

      return {
        success: true,
        message: "Admin details updated successfully in Auth and Firestore.",
      };
    } catch (error: unknown) {
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

// --- V2 Callable Function: Create a new Admin User ---
interface CreateAdminUserData {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  allowedCategoryIds?: string[];
  canSendNotifications?: boolean;
}
export const createAdminUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateAdminUserData>) => {
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
      logger.error(
        "Error checking caller permissions for user creation:",
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Could not verify caller permissions."
      );
    }

    const {email, password, name, role, allowedCategoryIds = [], canSendNotifications = false} = request.data;
    if (!email || !password || !name || !role) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: email, password, name, role."
      );
    }
    if (password.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "Password must be at least 6 characters long."
      );
    }

    try {
      logger.info(
        `'createAdminUser' called by ${callerUid} for new user ${email}.`
      );
      const photoURL = `https://placehold.co/100x100.png?text=${name
        .substring(0, 2)
        .toUpperCase()}&bg=FF5733&txt=FFFFFF`;
      const userRecord = await fAuth.createUser({
        email: email,
        password: password,
        displayName: name,
        photoURL: photoURL,
      });

      logger.info(
        "Successfully created new user in Firebase Auth:",
        userRecord.uid
      );

      const adminDocRef = db.collection(ADMINS_COLLECTION).doc(userRecord.uid);
      const firestoreAdminData = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: name,
        role: role,
        avatar: photoURL,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        allowedCategoryIds:
          role === UserRole.SUB_ADMIN ? allowedCategoryIds : [],
        canSendNotifications: role === UserRole.SUPER_ADMIN ? true : canSendNotifications,
      };

      await adminDocRef.set(firestoreAdminData);
      logger.info(
        "Successfully created Firestore admin document for:",
        userRecord.uid
      );

      return {
        success: true,
        message: `Admin user ${name} created successfully.`,
        userId: userRecord.uid,
      };
    } catch (error: unknown) {
      logger.error("Error creating new admin user:", error);
      let errorCode: HttpsError["code"] = "unknown";
      let errorMessage = "Failed to create new admin user.";
      if (error && typeof error === "object" && "code" in error) {
        const firebaseErrorCode = (error as {code: string}).code;
        switch (firebaseErrorCode) {
          case "auth/email-already-exists":
            errorCode = "already-exists";
            errorMessage =
              "The email address is already in use by another account.";
            break;
          case "auth/invalid-email":
            errorCode = "invalid-argument";
            errorMessage = "The email address is not valid.";
            break;
          case "auth/weak-password":
            errorCode = "invalid-argument";
            errorMessage = "The new password is too weak.";
            break;
          default:
            errorCode = "internal";
            errorMessage =
              (error as unknown as Error).message ||
              "An internal error occurred during auth user creation.";
        }
        throw new HttpsError(errorCode, errorMessage, {
          originalCode: firebaseErrorCode,
        });
      }
      throw new HttpsError(
        "internal",
        (error as unknown as Error).message || "An unknown error occurred."
      );
    }
  }
);


// --- V2 Callable Function: Delete Admin User ---
interface DeleteAdminUserData {
  targetUserId: string;
}

export const deleteAdminUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<DeleteAdminUserData>) => {
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
      if (targetUserRecord.email === "super@example.com") {
        throw new HttpsError("permission-denied", "Cannot delete the primary super admin account.");
      }

      // Delete from Auth
      await fAuth.deleteUser(targetUserId);
      logger.info(`Successfully deleted user ${targetUserId} from Firebase Auth.`);
      
      // Delete from Firestore
      await db.collection(ADMINS_COLLECTION).doc(targetUserId).delete();
      logger.info(`Successfully deleted Firestore admin document for ${targetUserId}.`);
      
      return { success: true, message: `Admin user ${targetUserRecord.displayName || targetUserRecord.email} has been deleted successfully.` };
    } catch (error: any) {
      logger.error(`Error deleting admin user ${targetUserId}:`, error);
      if (error.code === "auth/user-not-found") {
        try {
           await db.collection(ADMINS_COLLECTION).doc(targetUserId).delete();
           logger.info(`Firestore admin document for non-auth user ${targetUserId} deleted.`);
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

    
# Админ Про Төслийн Бичиг Баримт

Энэхүү баримт бичиг нь "Админ Про" контент удирдах системийн бүтэц, зорилго, ашигласан технологийн талаарх дэлгэрэнгүй мэдээллийг агуулна.
Super admin
email: admin@pro.com
password: 12345678

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

*   **`.env.local`:** Энэ файлд Firebase-ийн API түлхүүр зэрэг нууцлалтай, орчноос хамааралтай хувьсагчдыг хадгална. Энэ файл нь аюулгүй байдлын үүднээс Git-д commit хийгдэхгүй. Vercel дээр байршуулахдаа эдгээр хувьсагчдыг Vercel-ийн Environment Variables хэсэгт гараар тохируулж өгөх шаардлагатай.

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
*   **Админ үүсгэх логик:** `createAdminUser` функцийг дуудахад эхлээд тухайн и-мэйл хаяг `admins` коллекцид байгаа эсэхийг шалгадаг. Хэрэв бүртгэлтэй бол алдаа заана. Хэрэв бүртгэлгүй бол Firebase Authentication-д шинэ хэрэглэгч үүсгэхийг оролддог. Хэрэв Auth-д и-мэйл давхардсан бол Auth-ын алдааг буцаана. Ингэснээр зөвхөн цоо шинээр админ үүсгэх боломжтой бөгөөд аппын жирийн хэрэглэгчийг админ болгох боломжгүй юм.

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
    *   Энэ бол хамгийн чухал алхам. Таны локал дээрх `.env.local` файлд байгаа бүх нууц хувьсагчдыг (жишээ нь, `NEXT_PUBLIC_FIREBASE_API_KEY`) Vercel төслийн **Settings -> Environment Variables** хэсэгт нэг бүрчлэн хуулж оруулах шаардлагатай. Vercel нь таны `.env.local` файлыг уншихгүй.
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
*   **TypeScript:** `tsconfig.json` файлд тохиргоо нь хийгдсэн. TypeScript нь JavaScript дээр төрлийн систем (type system) нэмж өгснөөр кодын алдааг эрт илрүүлэх, уншигдах чадварыг сайжруулах, найдвартай байдлыг нэмэгдүүлэх ач холбогдолтой. `paths` тохиргоо нь `@/components` гэх мэт товч замыг ашиглах боломжийг олгодог.

### 7.3. Загварчлал (Tailwind CSS & ShadCN UI)

*   **Tailwind CSS:** `tailwind.config.ts` болон `src/app/globals.css` файлуудад тохиргоо нь хийгдсэн. Энэ нь utility-first аргачлалаар HTML дотор классууд бичиж, хурдан хугацаанд загварчлал хийх боломжийг олгодог. Өнгө, фонт зэрэг үндсэн загварын тохиргоог `globals.css`-д HSL хувьсагч ашиглан төвлөрүүлж, `tailwind.config.ts`-д өргөтгөсөн.
*   **ShadCN UI:** `components.json`-оор удирдуулдаг. Энэ нь урьдчилан бэлдсэн, дахин ашиглах боломжтой, загварлаг UI компонентуудын цуглуулга юм. `shadcn-ui` коммандаар шинэ компонент нэмэхэд тохиргоог энэ файлаас уншина.

### 7.4. Хувилбарын Удирдлага (Git & GitHub)

*   **Git:** Кодын өөрчлөлт бүрийг мөшгиж, хувилбаруудыг удирдах систем.
*   **`.gitignore`:** Git-д commit хийх шаардлагагүй файлуудыг (жишээ нь, `node_modules`, `.env.local`, `firestore-debug.log`) үл тоомсорлох тохиргоог агуулдаг. Энэ нь репозиторийг цэвэрхэн, аюулгүй байлгахад чухал үүрэгтэй.

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

3.  **`.env.local` файлыг тохируулах:**
    Төслийн үндсэн хавтаст `.env.example` файлыг хуулж, `.env.local` нэртэй шинэ файл үүсгэнэ. Дараа нь тэрхүү `.env.local` файлд Firebase төслийнхөө тохиргоог доорх жишээний дагуу оруулна уу (9.2 хэсгийг харна уу). Энэ файлгүйгээр аппликейшн Firebase-тэй холбогдож чадахгүй.

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

### 9.2. `.env.local` Файлын жишээ

`.env.example` файлаас хуулбарласан `.env.local` файлд Firebase Console-оос авсан өөрийн төслийн тохиргоог доорх загварын дагуу оруулна уу.

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
1.  **И-мэйл хаяг бүртгэлтэй:** Таны нэмэхийг оролдсон и-мэйл хаяг нь аппликейшны жирийн хэрэглэгчээр Firebase Authentication-д аль хэдийн бүртгэлтэй байж магадгүй. Манай системд зөвхөн цоо шинэ и-мэйл хаягаар админ үүсгэх боломжтой.
2.  **Нууц үг:** Хэрэглэгчид өгсөн нууц үг зөв эсэхийг шалгаарай.
3.  **Firestore бичилт:** `admins` коллекцид шинэ админы мэдээлэл зөв бичигдсэн эсэхийг Firebase Console-оос шалгаарай.

**А: Cloud Function deploy хийхэд алдаа заагаад байна. Яах вэ?**
**Х:** Түгээмэл алдаанууд ба шийдлүүд:
1.  **Billing:** Firebase төслийн төлбөрийн төлөвлөгөө нь "Blaze (Pay as you go)" байх ёстой. Үнэгүй "Spark" төлөвлөгөө нь Cloud Functions-г дэмждэггүй.
2.  **Node.js хувилбар:** `functions/package.json` файлын `engines` хэсэгт заасан Node.js хувилбар таны орчинд тохирч байгаа эсэхийг шалгаарай (одоогийн байдлаар "20").
3.  **Алдааны log:** Терминал дээрх алдааны дэлгэрэнгүй мэдээллийг уншиж, Firebase Console-ийн Functions хэсгийн Logs-г шалгаарай.

**А: Дэд админ зарим нэг категорид хандаж чадахгүй байна.**
**Х:** Сүпер админ нь **Админ Удирдлага > Хэрэглэгчид** хэсгээс тухайн дэд админыг сонгож, "Зөвшөөрсөн категориуд" хэсэгт хандах ёстой категориудыг нь оноож өгсөн эсэхийг шалгаарай.

### 10.2. Боломжит Сайжруулалтууд

Эдгээр нь төслийг ирээдүйд өргөжүүлэх, сайжруулах боломжтой санаанууд юм:

*   **Админы үйл ажиллагааны түүх:** Админ хэрэглэгчид системд ямар өөрчлөлт хийснийг бүртгэж, хянах боломжтой лог хэсгийг нэмэх. Энэ нь хэн, юуг, хэзээ өөрчилснийг хянахад тусална.
*   **Дэвшилтэт хяналтын самбар:** Хяналтын самбарыг илүү ухаалаг болгож, контентын хандалт, хэрэглэгчийн идэвх зэргийг харуулсан график, статистик мэдээллээр баяжуулах.
*   **Контентын хувилбарын түүх:** Бүртгэл бүрийн өөрчлөлтийн түүхийг хадгалж, шаардлагатай үед өмнөх хувилбарыг сэргээх боломжийг бий болгох.
*   **Нэвтрэлтийн аюулгүй байдлыг нэмэгдүүлэх:** Нэмэлт баталгаажуулалтын код ашигладаг (2FA - Two-Factor Authentication) нэвтрэлтийн системийг нэвтрүүлж, админы бүртгэлийн аюулгүй байдлыг сайжруулах.
*   **Илүү ухаалаг хайлт:** Хэрэглэгч, категори, бүртгэлийн жагсаалт дээр илүү олон талбараар шүүх, нарийвчилсан хайлт хийх боломжийг хөгжүүлэх.
*   **Автоматжуулсан тест:** Системийн найдвартай ажиллагааг хангахын тулд кодын чанарыг автоматаар шалгадаг тестүүдийг нэмж өгөх.

---

## 11. Файлын Дэлгэрэнгүй Бүтэц (File Structure Deep Dive)

Энэ хэсэгт төслийн бүтэц, хавтас, файлуудын үүргийг илүү дэлгэрэнгүй тайлбарлана.

### 11.1 Үндсэн тохиргооны файлууд (Root Directory)

Төслийн үндсэн хавтаст байрлах гол тохиргооны файлууд:

*   `package.json`: Төслийн хамаарлууд (`dependencies`, `devDependencies`) болон скриптүүдийг (`dev`, `build`, `lint`) тодорхойлдог үндсэн файл.
*   `next.config.js`: Next.js аппликейшны тохиргоог агуулна. Жишээ нь, гаднын зургийн эх сурвалжийг `images.remotePatterns`-д тохируулдаг.
*   `tailwind.config.ts`: Tailwind CSS-ийн тохиргооны файл. Өнгөний схем, фонт, сүүдэр зэрэг загварын тохиргоог өргөтгөхөд ашиглагдана.
*   `tsconfig.json`: TypeScript хөрвүүлэгчийн тохиргоог агуулна. `@/*` гэх мэт товч замуудыг тодорхойлдог.
*   `firebase.json`: Firebase үйлчилгээнүүдийн (Firestore, Functions) тохиргоог агуулна. `firestore.rules`-ийг зааж, `functions`-ийн `predeploy` скриптийг тодорхойлно.
*   `firestore.indexes.json`: Firestore-ийн нийлмэл query (composite query) хийхэд шаардлагатай index-үүдийн тодорхойлолтыг агуулна.
*   `components.json`: `shadcn/ui` компонентуудыг удирдах тохиргооны файл. Компонентын зам, alias зэргийг тодорхойлно.
*   `.env.local`: Firebase API түлхүүр зэрэг нууцлалтай, орчноос хамааралтай хувьсагчдыг хадгалах файл. (**`.gitignore`**-д орсон тул GitHub-д орохгүй).
*   `.env.example`: `.env.local` файлын загвар. Энэ нь төсөлд ямар хувьсагчид шаардлагатайг харуулдаг бөгөөд нууц утга агуулдаггүй.
*   `.gitignore`: Git-д commit хийх шаардлагагүй файлууд, хавтаснуудыг (жишээ нь, `node_modules`, `.env.local`) жагсаадаг.
*   `.vscode/settings.json`: Visual Studio Code эдиторын тохиргоог агуулна. Энэ нь багийн гишүүд нэгдсэн код засварлах орчинг бүрдүүлэхэд тусалдаг.
*   `apphosting.yaml`: Firebase App Hosting дээр backend-г удирдах тохиргоог агуулна. Жишээ нь, `maxInstances` нь ачаалал ихсэх үед автоматаар ажиллах инстансын тоог тодорхойлно.
*   `next-env.d.ts`: Next.js-ийн TypeScript төрлийн тодорхойлолтуудыг автоматаар агуулдаг файл. Үүнийг засах шаардлагагүй.
*   `vercel.json`: Vercel платформ дээр deploy хийх тохиргоог агуулна.
*   `DOCUMENTATION.md`: Энэхүү баримт бичиг.

### 11.2 Firebase Cloud Functions (`/functions`)

Сервер талын логикийг агуулсан хавтас:

*   `functions/package.json`: Cloud Function-д шаардлагатай сангуудыг (`firebase-admin`, `firebase-functions`) тодорхойлдог файл.
*   `functions/src/index.ts`: Бүх Cloud Function-уудын гол логикийг агуулсан үндсэн файл. `onCall` ашиглан клиент талаас дуудагдах функцүүдийг энд бичнэ.
*   `functions/src/types.ts`: Зөвхөн функцийн орчинд хэрэглэгдэх TypeScript төрлүүдийг тодорхойлдог.
*   `functions/.eslintrc.js`: Cloud Function-ийн кодод зориулсан ESLint-ийн тохиргоо.
*   `functions/tsconfig.json`: Cloud Function-ийн TypeScript хөрвүүлэгчийн үндсэн тохиргоо.
*   `functions/tsconfig.dev.json`: ESLint зэрэг хөгжүүлэлтийн хэрэгслийг зөв ажиллуулах зорилготой, TypeScript-ийн нэмэлт тохиргооны файл.

### 11.3 Next.js апп-н эх код (`/src`)

Аппликейшны үндсэн код:

#### `/src/app` (Routing & Layouts)

Next.js-ийн App Router-ийн үндэс. Хуудас бүрийн замчлал энд тодорхойлогдоно.

*   `globals.css`: Апп даяар ашиглагдах үндсэн CSS загварууд болон Tailwind CSS-ийн HSL хувьсагчдыг агуулна.
*   `layout.tsx`: Аппликейшны үндсэн (root) layout. Бүх хуудсанд нөлөөлөх HTML, `AuthProvider`-г агуулдаг.
*   `page.tsx`: Нэвтрэх хуудасны UI болон логикийг агуулна.
*   **`/admin`**: Админы бүх хуудас, layout-г агуулсан үндсэн хавтас.
    *   `layout.tsx`: Нэвтэрсэн админ хэрэглэгчдэд зориулсан үндсэн layout. Sidebar, header зэрэг компонентуудыг агуулна.
    *   **Замчлал (Routes):**
        *   `/dashboard`: Хяналтын самбарын хуудас.
        *   `/users`: Админ хэрэглэгчдийг удирдах хэсэг.
        *   `/categories`: Контентийн бүтцийг (ангилал) удирдах хэсэг.
        *   `/entries`: Үүсгэсэн категорийн дагуу контентын бүртгэл нэмэх, удирдах хэсэг.
        *   `/banners`: Вебсайтад харагдах баннеруудыг удирдах хэсэг.
        *   `/cities`: Системд ашиглагдах хотуудын жагсаалтыг удирдах хэсэг.
        *   `/notifications`: Хэрэглэгчид рүү push notification илгээх хэсэг.
        *   `/anket`: Хэрэглэгчдээс ирүүлсэн анкет/хүсэлтийг удирдах хэсэг.
        *   `/help`: Тусламж, түгээмэл асуулт хариултын хэсгийг удирдах.
        *   `/profile`: Нэвтэрсэн хэрэглэгчийн өөрийн профайлыг удирдах хуудас.
    *   **Бүтэц:** Дээрх хуудас бүр Next.js-ийн стандарт бүтцийг дагана (`page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`). Мөн хуудас бүр өөртөө зориулсан тусгай компонентуудыг `/components/` хавтас дотор агуулж болно (жишээ нь, `app/admin/users/components/user-form.tsx`).

#### `/src/components` (UI Components)

Дахин ашиглагдах боломжтой React компонентууд.

*   **`/admin`**: Админ панельд зориулсан, хуудас хооронд дахин ашиглагддаг ерөнхий компонентууд.
    *   `admin-header.tsx`, `sidebar-nav.tsx`, `user-nav.tsx`: Админы үндсэн layout-н хэсгүүд.
    *   `image-uploader.tsx`: Зураг байршуулах логик бүхий компонент.
    *   `page-header.tsx`: Хуудасны гарчиг, тайлбарыг харуулдаг стандарт компонент.
    *   `logo.tsx`: Системийн лого.
*   **`/ui`**: `shadcn/ui`-аас үүсгэсэн үндсэн, загваргүй UI компонентууд. Жишээ нь: `button.tsx`, `card.tsx`, `input.tsx`, `dialog.tsx`, `table.tsx`, `alert.tsx`, `avatar.tsx`, `badge.tsx`, `calendar.tsx` гэх мэт.

#### `/src/lib` (Core Logic & Actions)

Аппликейшны гол логик, туслах функцүүд.

*   **`/actions`**: Firebase-тэй харьцах сервер талын бүх үйлдлийг агуулна. Файл бүр тодорхой нэг өгөгдлийн төрөл дээр хийгдэх CRUD (Create, Read, Update, Delete) үйлдлүүдийг агуулдаг. Жишээлбэл: `userActions.ts`, `categoryActions.ts`, `entryActions.ts`, `bannerActions.ts`, `cityActions.ts`, `helpActions.ts`, `notificationActions.ts`.
*   **`/firebase.ts`**: Firebase-ийн клиент талын тохиргоог хийж, `auth`, `db`, `storage` зэрэг үйлчилгээний объектуудыг экспортлодог.
*   **`/utils.ts`**: Түгээмэл хэрэглэгддэг туслах функцүүд. `cn` нь class нэгтгэгч, `slugify` нь URL-д ээлтэй текст үүсгэгч.

#### `/src/contexts`, `/src/hooks`, `/src/types`, `/src/ai`

*   **`/contexts/auth-context.tsx`**: Хэрэглэгчийн нэвтрэлтийн мэдээллийг апп даяар дамжуулах React Context.
*   **`/hooks`**: `useAuth.ts`, `useToast.ts`, `use-mobile.tsx` гэх мэт custom React hook-ууд.
*   **`/types/index.ts`**: Апп даяар ашиглагдах бүх TypeScript төрлийн тодорхойлолтыг агуулдаг.
*   **`/ai`**: Genkit-тэй холбоотой бүх код. `genkit.ts` (тохиргоо), `flows/*` (хиймэл оюуны ажлын урсгал).
    *   `dev.ts`: Локал орчинд Genkit-ийн flow-уудыг ажиллуулж, туршихад зориулагдсан файл.

---

## 12. Товчилсон үгийн тайлбар (Glossary)

Энэхүү баримт бичигт ашиглагдсан техникийн товчилсон үгсийн тайлбар.

| Товчлол | Англи нэр | Монгол тайлбар |
|---|---|---|
| **CMS** | Content Management System | Контент Удирдах Систем |
| **UI** | User Interface | Хэрэглэгчийн Интерфейс |
| **UX** | User Experience | Хэрэглэгчийн Туршлага |
| **SSR** | Server-Side Rendering | Сервер талын рендэринг |
| **SSG** | Static Site Generation | Статик сайт үүсгэх |
| **API** | Application Programming Interface | Аппликейшны Програмчлалын Интерфейс |
| **FCM** | Firebase Cloud Messaging | Firebase-ийн Клауд Мессеж Үйлчилгээ |
| **SDK** | Software Development Kit | Програм Хангамжийн Хөгжүүлэлтийн Багц |
| **CRUD** | Create, Read, Update, Delete | Үүсгэх, Унших, Шинэчлэх, Устгах |
| **FAQ** | Frequently Asked Questions | Түгээмэл Асуулт Хариулт |
| **2FA** | Two-Factor Authentication | Хоёр Хүчин Зүйлийн Баталгаажуулалт |
| **HSL** | Hue, Saturation, Lightness | Өнгө, Ханалт, Гэрэлтэлт |
| **IATA** | International Air Transport Association | Олон Улсын Агаарын Тээврийн Холбоо |

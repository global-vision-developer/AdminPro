import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS классуудыг нэгтгэх, нөхцөлтэйгөөр ашиглах функц.
 * @param inputs - Нэгтгэх классын утгууд.
 * @returns Нэгтгэсэн, цэвэрлэсэн классын нэр.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Текстийг URL-д ээлтэй "slug" болгож хувиргах функц.
 * @param text - Хувиргах текст.
 * @returns Хувиргасан slug.
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

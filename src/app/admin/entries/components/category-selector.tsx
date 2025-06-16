
"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Category } from "@/types";

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId?: string; // The ID from URL search params, could be undefined
}

export function CategorySelector({ categories, selectedCategoryId }: CategorySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleCategoryChange = (categoryId: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (categoryId === "all" || !categoryId) {
      current.delete("category");
    } else {
      current.set("category", categoryId);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  if (categories.length === 0) { 
    return null; 
  }

  return (
    <div className="mb-6 max-w-xs">
      <Label htmlFor="category-select" className="text-sm font-medium mb-1 block">
        Filter by Category
      </Label>
      <Select
        value={selectedCategoryId || "all"} // Default to "all" if no specific category is selected via URL
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger id="category-select" className="w-full">
          <SelectValue placeholder="Choose a category..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

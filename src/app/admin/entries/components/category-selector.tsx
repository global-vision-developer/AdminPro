
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Category } from "@/types";
import { UserRole } from "@/types";
import { useAuth } from "@/hooks/use-auth";

interface CategorySelectorProps {
  allCategories: Category[]; // All categories fetched from the server
  selectedCategoryIdForUrl?: string; // The ID from URL search params, could be undefined
}

export function CategorySelector({ allCategories, selectedCategoryIdForUrl }: CategorySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const [displayCategories, setDisplayCategories] = useState<Category[]>(allCategories);

  useEffect(() => {
    if (currentUser && currentUser.role === UserRole.SUB_ADMIN) {
      if (currentUser.allowedCategoryIds && currentUser.allowedCategoryIds.length > 0) {
        setDisplayCategories(allCategories.filter(cat => currentUser.allowedCategoryIds!.includes(cat.id)));
      } else {
        setDisplayCategories([]); // SubAdmin has no assigned categories
      }
    } else {
      setDisplayCategories(allCategories); // SuperAdmin sees all
    }
  }, [currentUser, allCategories]);

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

  if (allCategories.length === 0) { 
    return null; // No categories in the system at all
  }
  
  if (currentUser && currentUser.role === UserRole.SUB_ADMIN && displayCategories.length === 0) {
    // SubAdmin is logged in but has no categories assigned to them
    return (
        <div className="mb-6 max-w-xs">
            <Label className="text-sm font-medium mb-1 block text-muted-foreground">
                Ангиллаар шүүх
            </Label>
            <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
                Бичлэг удирдах ангилал оноогоогүй байна.
            </p>
        </div>
    );
  }


  return (
    <div className="mb-6 max-w-xs">
      <Label htmlFor="category-select" className="text-sm font-medium mb-1 block">
        Ангиллаар шүүх
      </Label>
      <Select
        value={selectedCategoryIdForUrl || "all"} 
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger id="category-select" className="w-full">
          <SelectValue placeholder="Ангилал сонгоно уу..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Бүх Ангилалууд</SelectItem>
          {displayCategories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

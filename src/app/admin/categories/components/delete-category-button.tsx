
"use client";

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteCategory } from '@/lib/actions/categoryActions';
import { useRouter } from 'next/navigation'; // Added import

interface DeleteCategoryButtonProps {
  categoryId: string;
  categoryName: string;
}

export function DeleteCategoryButton({ categoryId, categoryName }: DeleteCategoryButtonProps) {
  const { toast } = useToast();
  const router = useRouter(); // Initialized useRouter

  const handleDelete = async () => {
    const result = await deleteCategory(categoryId);
    if (result.success) {
      toast({
        title: "Ангилал устгагдлаа",
        description: `"${categoryName}" ангилал болон түүнд хамаарах бүх бүртгэлүүд амжилттай устгагдлаа.`,
      });
      router.refresh(); // Explicitly refresh the current route to update the UI
    } else if (result.error) {
      toast({
        title: "Ангилал устгахад алдаа гарлаа",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" aria-label="Ангилал устгах">
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Устгах</TooltipContent>
        </Tooltip>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
          <AlertDialogDescription>
            Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{categoryName}" ангиллыг болон түүнд хамаарах бүх бүртгэлийг бүрмөсөн устгах болно.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Цуцлах</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Устгах
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


"use client";

import React, { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteCategory } from '@/lib/actions/categoryActions';

interface DeleteCategoryButtonProps {
  categoryId: string;
  categoryName: string;
  onSuccess?: () => void;
}

export function DeleteCategoryButton({ categoryId, categoryName, onSuccess }: DeleteCategoryButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteCategory(categoryId);
    
    if (result.success) {
      toast({
        title: "Ангилал устгагдлаа",
        description: `"${categoryName}" ангилал болон түүнд хамаарах бүх бүртгэлүүд амжилттай устгагдлаа.`,
      });
      onSuccess?.();
    } else if (result.error) {
      toast({
        title: "Ангилал устгахад алдаа гарлаа",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsDeleting(false);
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
           <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" aria-label="Ангилал устгах">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Устгах</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
          <AlertDialogDescription>
            Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{categoryName}" ангиллыг болон түүнд хамаарах бүх бүртгэлийг бүрмөсөн устгах болно.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsOpen(false)} disabled={isDeleting}>Цуцлах</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Устгах
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


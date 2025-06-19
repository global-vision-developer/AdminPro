
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteCity } from '@/lib/actions/cityActions';

interface DeleteCityButtonProps {
  cityId: string;
  cityName: string;
}

export function DeleteCityButton({ cityId, cityName }: DeleteCityButtonProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteCity(cityId);
    setIsDeleting(false);
    setIsOpen(false); 

    if (result.success) {
      toast({
        title: "Хот устгагдлаа",
        description: `"${cityName}" нэртэй хот амжилттай устгагдлаа.`,
      });
    } else if (result.error) {
      toast({
        title: "Хот устгахад алдаа гарлаа",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" aria-label="Хот устгах">
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
            Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{cityName}" нэртэй хотыг бүрмөсөн устгах болно.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Цуцлах</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Устгах
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

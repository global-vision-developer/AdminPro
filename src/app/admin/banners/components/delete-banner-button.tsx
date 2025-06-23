
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteBanner } from '@/lib/actions/bannerActions';
import { useRouter } from 'next/navigation';

interface DeleteBannerButtonProps {
  bannerId: string;
  bannerDescription: string;
}

export function DeleteBannerButton({ bannerId, bannerDescription }: DeleteBannerButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();

  const handleTriggerClick = () => {
    setIsOpen(true);
  };

  const handleDelete = async () => {
    if (!bannerId) {
      toast({
        title: "Алдаа",
        description: "Баннерын ID олдсонгүй. Устгах боломжгүй.",
        variant: "destructive",
      });
      setIsDeleting(false);
      setIsOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteBanner(bannerId);
      
      if (result && result.success) {
        toast({
          title: "Баннер устгагдлаа",
          description: `"${bannerDescription}" тайлбартай баннер амжилттай устгагдлаа.`,
        });
        router.refresh();
      } else if (result && result.error) {
        toast({
          title: "Баннер устгахад алдаа гарлаа",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Үл мэдэгдэх алдаа",
          description: "Баннер устгахад үл мэдэгдэх алдаа гарлаа.",
          variant: "destructive",
        });
      }
    } catch (error) {
        toast({
          title: "Гэнэтийн алдаа",
          description: "Баннер устгах явцад гэнэтийн алдаа гарлаа.",
          variant: "destructive",
        });
    } finally {
        setIsDeleting(false);
        setIsOpen(false); 
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive hover:text-destructive/90" 
              aria-label="Баннер устгах"
              onClick={handleTriggerClick}
            >
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
            Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{bannerDescription}" тайлбартай баннерыг бүрмөсөн устгах болно.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => setIsOpen(false)} 
            disabled={isDeleting}
          >
            Цуцлах
          </AlertDialogCancel>
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

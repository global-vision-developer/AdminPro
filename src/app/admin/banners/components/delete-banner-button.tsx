
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

  console.log("[DeleteBannerButton] Rendering. bannerId:", bannerId, "bannerDescription:", bannerDescription);

  const handleTriggerClick = () => {
    console.log("[DeleteBannerButton] AlertDialogTrigger (Trash Icon) clicked. Setting isOpen to true via onClick.");
    setIsOpen(true);
  };

  const handleDelete = async () => {
    console.log("[DeleteBannerButton] handleDelete triggered. bannerId:", bannerId);
    if (!bannerId) {
      console.error("[DeleteBannerButton] bannerId is missing!");
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
    console.log("[DeleteBannerButton] Calling deleteBanner server action...");
    try {
      const result = await deleteBanner(bannerId);
      console.log("[DeleteBannerButton] Server action result:", result);
      
      if (result && result.success) {
        console.log("[DeleteBannerButton] Deletion successful. Toasting and refreshing.");
        toast({
          title: "Баннер устгагдлаа",
          description: `"${bannerDescription}" тайлбартай баннер амжилттай устгагдлаа.`,
        });
        router.refresh();
      } else if (result && result.error) {
        console.error("[DeleteBannerButton] Deletion failed. Error:", result.error);
        toast({
          title: "Баннер устгахад алдаа гарлаа",
          description: result.error,
          variant: "destructive",
        });
      } else {
        console.error("[DeleteBannerButton] Unknown result from server action:", result);
        toast({
          title: "Үл мэдэгдэх алдаа",
          description: "Баннер устгахад үл мэдэгдэх алдаа гарлаа.",
          variant: "destructive",
        });
      }
    } catch (error) {
        console.error("[DeleteBannerButton] Exception during deleteBanner call or subsequent logic:", error);
        toast({
          title: "Гэнэтийн алдаа",
          description: "Баннер устгах явцад гэнэтийн алдаа гарлаа.",
          variant: "destructive",
        });
    } finally {
        console.log("[DeleteBannerButton] handleDelete finally block. Setting isDeleting=false, setIsOpen=false.");
        setIsDeleting(false);
        setIsOpen(false); 
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(openState) => {
      console.log("[DeleteBannerButton] AlertDialog onOpenChange. New state:", openState, "Current isOpen state:", isOpen);
      // We manage isOpen explicitly via button clicks to avoid issues with onOpenChange firing unexpectedly
      // if the trigger method also changes it.
      // If !openState (dialog is closing), ensure our local state reflects that.
      if (!openState && isOpen) {
          setIsOpen(false);
      }
    }}>
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
            onClick={() => {
              console.log("[DeleteBannerButton] AlertDialogCancel clicked. Setting isOpen to false.");
              setIsOpen(false);
            }} 
            disabled={isDeleting}
          >
            Цуцлах
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              console.log("[DeleteBannerButton] AlertDialogAction (Confirm Delete) clicked. Attempting to call handleDelete.");
              handleDelete();
            }}
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

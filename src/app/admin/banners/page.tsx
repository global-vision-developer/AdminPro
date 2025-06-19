
import React from 'react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { PlusCircle, Edit, Trash2, Image as ImageIcon, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { Banner } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import NextImage from 'next/image'; // Renamed to avoid conflict with lucide-react Image
import { getBanners, deleteBanner } from '@/lib/actions/bannerActions'; // Placeholder for actions
import { toast } from '@/hooks/use-toast'; // For delete feedback

// Client component for delete button to handle dialog and server action call
function DeleteBannerButton({ bannerId, bannerDescription }: { bannerId: string; bannerDescription: string }) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteBanner(bannerId);
    setIsDeleting(false);
    setIsOpen(false);

    if (result.success) {
      toast({
        title: "Баннер устгагдлаа",
        description: `"${bannerDescription}" тайлбартай баннер амжилттай устгагдлаа.`,
      });
      // Revalidation handled by server action
    } else if (result.error) {
      toast({
        title: "Баннер устгахад алдаа гарлаа",
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
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" aria-label="Баннер устгах">
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


export default async function BannersPage() {
  noStore();
  const banners = await getBanners();

  return (
    <TooltipProvider>
      <PageHeader title="Баннер Удирдах" description="Вебсайтын баннеруудыг нэмэх, засах, устгах.">
        <Link href="/admin/banners/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Шинэ баннер нэмэх
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Баннерын Жагсаалт</CardTitle>
          <CardDescription>
            Одоо байгаа бүх баннерууд. Зургийг Base64 хэлбэрээр Firestore-д хадгалсан.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {banners.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Зураг</TableHead>
                    <TableHead>Тайлбар</TableHead>
                    <TableHead className="hidden md:table-cell">Холбоос</TableHead>
                    <TableHead className="text-center">Статус</TableHead>
                    <TableHead className="text-right">Үйлдлүүд</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners.map((banner) => (
                    <TableRow key={banner.id}>
                      <TableCell>
                        {banner.imageUrl ? (
                          <NextImage
                            data-ai-hint="banner image"
                            src={banner.imageUrl} // Assumed Base64 data URI
                            alt={banner.description.substring(0, 30)}
                            width={80}
                            height={45} // Assuming 16:9 aspect ratio for thumbnail
                            className="rounded object-cover border"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x45.png?text=Error'; }}
                          />
                        ) : (
                          <div className="w-[80px] h-[45px] flex items-center justify-center bg-muted rounded border text-xs text-muted-foreground">No Image</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate" title={banner.description}>
                        {banner.description}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        {banner.link ? (
                          <a href={banner.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            {banner.link} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">Линкгүй</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {banner.isActive ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
                            <Eye className="mr-1 h-3 w-3" /> Идэвхтэй
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="mr-1 h-3 w-3" /> Идэвхгүй
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/admin/banners/${banner.id}/edit`} passHref>
                                <Button variant="ghost" size="icon" aria-label="Баннер засах">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Засах</TooltipContent>
                          </Tooltip>
                          <DeleteBannerButton bannerId={banner.id} bannerDescription={banner.description} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Баннер олдсонгүй</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Эхлээд шинэ баннер үүсгэнэ үү.
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/banners/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Шинэ баннер үүсгэх
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export const metadata = {
  title: "Banners | Admin Pro",
};


import React from 'react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { PlusCircle, Edit, Image as ImageIcon, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { Banner } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getBanners } from '@/lib/actions/bannerActions';
import { BannerImage } from './components/banner-image';
import { DeleteBannerButton } from './components/delete-banner-button';


export default async function BannersPage() {
  noStore();
  const banners = await getBanners();

  return (
    <TooltipProvider>
      <PageHeader title="Баннер Удирдах" description="Вебсайтын баннеруудыг нэмэх, засах, устгах.">
        <Link href="/admin/banners/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Нэмэх
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
                        <BannerImage
                          src={banner.imageUrl}
                          alt={banner.description.substring(0, 30)}
                          width={80}
                          height={45}
                          className="rounded object-cover border"
                          dataAiHint="banner image"
                        />
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


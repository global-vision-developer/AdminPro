
import React from 'react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { PlusCircle, Edit, MapPin, Building, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { City } from '@/types';
import { CITY_TYPE_DISPLAY_NAMES, CityType } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCities } from '@/lib/actions/cityActions';
import { DeleteCityButton } from './components/delete-city-button';
import { Badge } from '@/components/ui/badge';


export default async function CitiesPage() {
  noStore();
  const cities = await getCities();

  const getCityTypeBadge = (cityType: CityType) => {
    switch (cityType) {
      case CityType.MAJOR:
        return <Badge variant="default" className="bg-sky-500 hover:bg-sky-600"><Building className="mr-1 h-3 w-3" />Том хот</Badge>;
      case CityType.OTHER:
        return <Badge variant="secondary"><MapPin className="mr-1 h-3 w-3" />Бусад</Badge>;
      default:
        return <Badge variant="outline">{CITY_TYPE_DISPLAY_NAMES[cityType] || cityType}</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <PageHeader title="Хотууд" description="Системд бүртгэлтэй хотуудыг удирдах.">
        <Link href="/admin/cities/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Шинэ хот нэмэх
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Хотын Жагсаалт</CardTitle>
          <CardDescription>
            Бүртгэлтэй бүх хотууд. Эрэмбээр жагсаасан.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cities.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">Эрэмбэ</TableHead>
                    <TableHead>Монгол нэр</TableHead>
                    <TableHead className="hidden md:table-cell">Хятад нэр</TableHead>
                    <TableHead className="text-center">Төрөл</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">IATA</TableHead>
                    <TableHead className="text-right">Үйлдлүүд</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cities.map((city) => (
                    <TableRow key={city.id}>
                      <TableCell className="text-center">{city.order}</TableCell>
                      <TableCell className="font-medium">
                        {city.name}
                        <p className="text-xs text-muted-foreground md:hidden">{city.nameCN}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{city.nameCN}</TableCell>
                      <TableCell className="text-center">{getCityTypeBadge(city.cityType)}</TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {city.iataCode ? (
                            <Badge variant="outline" className="font-mono"><Plane className="mr-1 h-3 w-3" />{city.iataCode}</Badge>
                        ) : (
                            <span className="text-muted-foreground text-xs italic">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/admin/cities/${city.id}/edit`} passHref>
                                <Button variant="ghost" size="icon" aria-label="Хот засах">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Засах</TooltipContent>
                          </Tooltip>
                          <DeleteCityButton cityId={city.id} cityName={city.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Хот олдсонгүй</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Эхлээд шинэ хот үүсгэнэ үү.
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/cities/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Шинэ хот үүсгэх
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
  title: "Хотууд | Admin Pro",
};

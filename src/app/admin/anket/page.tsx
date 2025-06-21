
import React from 'react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { Eye, Filter, Clock, CheckCircle, XCircle, FileText, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { Anket } from '@/types';
import { AnketStatus } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAnkets } from '@/lib/actions/anketActions'; 
import { format } from 'date-fns';

export default async function AnketsPage({
  searchParams
}: {
  searchParams?: { status?: AnketStatus }
}) {
  noStore();
  const statusFilter = searchParams?.status;
  const ankets = await getAnkets(statusFilter);

  const getStatusBadge = (status: AnketStatus) => {
    switch (status) {
      case AnketStatus.PENDING:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="mr-1 h-3 w-3" />Хүлээгдэж буй</Badge>;
      case AnketStatus.APPROVED:
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3 w-3" />Зөвшөөрсөн</Badge>;
      case AnketStatus.REJECTED:
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Татгалзсан</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <PageHeader title="Анкет Удирдах" description="Ирүүлсэн анкетуудыг хянах, боловсруулах." />
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Анкетын Жагсаалт</CardTitle>
          <CardDescription>
            {statusFilter ? `${statusFilter.toUpperCase()} статустай анкетууд.` : "Бүх анкетууд."}
            <div className="mt-2 flex gap-2">
                <Link href="/admin/anket"><Button variant={!statusFilter ? "default" : "outline"} size="sm">Бүгд</Button></Link>
                <Link href="/admin/anket?status=pending"><Button variant={statusFilter === AnketStatus.PENDING ? "default" : "outline"} size="sm">Хүлээгдэж буй</Button></Link>
                <Link href="/admin/anket?status=approved"><Button variant={statusFilter === AnketStatus.APPROVED ? "default" : "outline"} size="sm">Зөвшөөрсөн</Button></Link>
                <Link href="/admin/anket?status=rejected"><Button variant={statusFilter === AnketStatus.REJECTED ? "default" : "outline"} size="sm">Татгалзсан</Button></Link>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ankets.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Нэр</TableHead>
                    <TableHead className="hidden md:table-cell">Имэйл</TableHead>
                    <TableHead className="hidden sm:table-cell">Утас</TableHead>
                    <TableHead className="text-center">Илгээсэн огноо</TableHead>
                    <TableHead className="text-center">Статус</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ankets.map((anket) => (
                    <TableRow key={anket.id}>
                      <TableCell className="font-medium">
                        {anket.name}
                        <p className="text-xs text-muted-foreground md:hidden">{anket.email}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{anket.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">{anket.phoneNumber || "N/A"}</TableCell>
                      <TableCell className="text-center">
                        {format(new Date(anket.submittedAt), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(anket.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/admin/anket/${anket.id}`} passHref>
                              <Button variant="ghost" size="icon" aria-label="Анкет үзэх">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Дэлгэрэнгүй үзэх / Боловсруулах</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Анкет олдсонгүй</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {statusFilter ? "Энэ статустай анкет одоогоор алга." : "Ирүүлсэн анкет байхгүй байна."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

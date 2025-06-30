
"use client";

import React from 'react';
import type { NotificationLog, NotificationTarget } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertTriangle, Clock, Send, Users, Loader2, XCircle, MoreHorizontal } from 'lucide-react';

interface NotificationHistoryProps {
  logs: NotificationLog[];
  isLoading: boolean;
}

export function NotificationHistory({ logs, isLoading }: NotificationHistoryProps) {

  const getStatusBadge = (status: NotificationLog['processingStatus']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3 w-3" /> Амжилттай</Badge>;
      case 'partially_completed':
        return <Badge variant="destructive" className="bg-yellow-500 hover:bg-yellow-600"><AlertTriangle className="mr-1 h-3 w-3" />Хэсэгчилэн</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="text-blue-600 border-blue-500"><Clock className="mr-1 h-3 w-3" />Хуваарьт</Badge>;
      case 'processing':
         return <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Боловсруулж байна</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Send className="mr-1 h-3 w-3" />Хүлээгдэж байна</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Алдаа гарсан</Badge>;
       case 'completed_no_targets':
        return <Badge variant="outline"><Users className="mr-1 h-3 w-3" />Token олдсонгүй</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTargetCounts = (targets: NotificationTarget[]) => {
      const total = targets.length;
      const success = targets.filter(t => t.status === 'success').length;
      const failed = targets.filter(t => t.status === 'failed').length;
      return { total, success, failed };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Илгээсэн Мэдэгдлийн Түүх</CardTitle>
        <CardDescription>Хамгийн сүүлд илгээсэн 50 мэдэгдлийн түүх.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
           <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Түүх ачаалж байна...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">Илгээсэн мэдэгдлийн түүх байхгүй.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
             <TooltipProvider>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Гарчиг</TableHead>
                        <TableHead className="hidden md:table-cell">Огноо</TableHead>
                        <TableHead className="text-center">Зорилтот тоо</TableHead>
                        <TableHead className="text-center">Төлөв</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {logs.map((log) => {
                        const counts = getTargetCounts(log.targets);
                        return (
                        <TableRow key={log.id}>
                            <TableCell className="font-medium max-w-xs">
                                <p className="truncate" title={log.title}>{log.title}</p>
                                <p className="text-xs text-muted-foreground truncate" title={log.body}>{log.body}</p>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                <Tooltip>
                                <TooltipTrigger>
                                    <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: enUS })}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{new Date(log.createdAt).toLocaleString()}</p>
                                    {log.scheduleAt && <p>Хуваарьт огноо: {new Date(log.scheduleAt).toLocaleString()}</p>}
                                </TooltipContent>
                                </Tooltip>
                            </TableCell>
                             <TableCell className="text-center">
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-default">
                                        <Users className="mr-1 h-3 w-3" /> {counts.total}
                                    </Badge>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                     <p>Амжилттай: <span className="text-green-500 font-semibold">{counts.success}</span></p>
                                     <p>Амжилтгүй: <span className="text-red-500 font-semibold">{counts.failed}</span></p>
                                 </TooltipContent>
                               </Tooltip>
                             </TableCell>
                            <TableCell className="text-center">{getStatusBadge(log.processingStatus)}</TableCell>
                        </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
             </TooltipProvider>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}


"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Fixed import
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import type { Anket } from '@/types';
import { AnketStatus } from '@/types';
import { getAnket, updateAnketStatus, approveAnketAndCreateTranslatorEntry } from '@/lib/actions/anketActions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, ArrowLeft, Download, FileText, User, Mail, Phone, MessageSquare, CalendarDays, Loader2, Check, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AnketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const anketId = params.id as string;

  const [anket, setAnket] = useState<Anket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchAnket = useCallback(async () => {
    if (!anketId) return;
    setIsLoading(true);
    const fetchedAnket = await getAnket(anketId);
    if (fetchedAnket) {
      setAnket(fetchedAnket);
    } else {
      toast({ title: "Алдаа", description: "Анкет олдсонгүй.", variant: "destructive" });
      router.push("/admin/anket");
    }
    setIsLoading(false);
  }, [anketId, router, toast]);

  useEffect(() => {
    fetchAnket();
  }, [fetchAnket]);

  const handleUpdateStatus = async (status: AnketStatus.APPROVED | AnketStatus.REJECTED) => {
    if (!anket || !currentUser) return;
    setProcessingError(null);
    setIsProcessing(true);

    let result;
    if (status === AnketStatus.APPROVED) {
      result = await approveAnketAndCreateTranslatorEntry(anket.id, currentUser.id);
    } else {
      result = await updateAnketStatus(anket.id, status, currentUser.id);
    }

    if (result && "success" in result && result.success) {
      toast({
        title: "Амжилттай",
        description: `Анкет ${status === AnketStatus.APPROVED ? "зөвшөөрөгдөж, орчуулагчийн бүртгэл үүслээ" : "татгалзлаа"}.`,
      });
      fetchAnket(); // Refresh anket data
    } else if (result && "error" in result && result.error) {
      setProcessingError(result.error);
      toast({ title: "Алдаа", description: result.error, variant: "destructive" });
    }
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Анкет ачаалж байна..." />
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24 ml-2" />
          </CardFooter>
        </Card>
      </>
    );
  }

  if (!anket) {
    return (
      <PageHeader title="Анкет олдсонгүй" description="Энэ анкет ачаалагдах боломжгүй эсвэл байхгүй байна." />
    );
  }

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

  const detailItem = (IconComponent: React.ElementType, label: string, value?: string | null) => {
    if (!value) return null;
    return (
      <div className="flex items-start space-x-3 py-2 border-b border-border/50 last:border-b-0">
        <IconComponent className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {label === "CV/Resume" && value.startsWith("http") ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center">
              {value} <Download className="ml-1 h-3 w-3" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title={`Анкет: ${anket.name}`} description="Ирүүлсэн анкетийн дэлгэрэнгүй мэдээлэл.">
        <Button variant="outline" onClick={() => router.push('/admin/anket')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Буцах
        </Button>
      </PageHeader>

      {processingError && (
         <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Боловсруулалтын Алдаа</AlertTitle>
            <AlertDescription>{processingError}</AlertDescription>
         </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline">Мэдүүлэгчийн мэдээлэл</CardTitle>
            {getStatusBadge(anket.status)}
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          {detailItem(User, "Нэр", anket.name)}
          {detailItem(Mail, "Имэйл", anket.email)}
          {detailItem(Phone, "Утасны дугаар", anket.phoneNumber)}
          {detailItem(FileText, "CV/Resume", anket.cvLink)}
          {detailItem(MessageSquare, "Нэмэлт мэдээлэл", anket.message)}
          {detailItem(CalendarDays, "Илгээсэн огноо", format(new Date(anket.submittedAt), "yyyy-MM-dd HH:mm:ss"))}
          {anket.processedAt && detailItem(Check, "Боловсруулсан огноо", format(new Date(anket.processedAt), "yyyy-MM-dd HH:mm:ss"))}
        </CardContent>
        {anket.status === AnketStatus.PENDING && (
          <CardFooter className="flex justify-end space-x-2 pt-6 border-t">
            <Button
              variant="destructive"
              onClick={() => handleUpdateStatus(AnketStatus.REJECTED)}
              disabled={isProcessing}
            >
              {isProcessing && anket.status === AnketStatus.PENDING ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Татгалзах
            </Button>
            <Button
              variant="default"
              className="bg-green-500 hover:bg-green-600"
              onClick={() => handleUpdateStatus(AnketStatus.APPROVED)}
              disabled={isProcessing}
            >
              {isProcessing && anket.status === AnketStatus.PENDING ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Зөвшөөрөх
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  );
}

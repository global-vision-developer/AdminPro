
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
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
import { 
  Globe, Building, Award, Languages, DollarSign, ScanLine, Smartphone, Smile, Flag, GraduationCap,
  CheckCircle, XCircle, Clock, ArrowLeft, Download, FileText, User, Mail, Phone, MessageSquare, 
  CalendarDays, Loader2, Check, AlertTriangle, Star, Briefcase, Camera, Home, Users as UsersIcon 
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Helper component for displaying an information row
const InfoRow = ({ icon: Icon, label, children }: { icon: React.ElementType, label: string, children?: React.ReactNode }) => {
  if (children === null || children === undefined || (typeof children === 'string' && children.trim() === '') || (Array.isArray(children) && children.length === 0)) {
    return null;
  }
  return (
    <div className="flex items-start space-x-4 py-3">
      <Icon className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
      <div className="flex-grow">
        <p className="font-medium text-foreground">{label}</p>
        <div className="text-sm text-muted-foreground mt-0.5">{children}</div>
      </div>
    </div>
  );
};

// Helper for image display
const ImageRow = ({ icon: Icon, label, src }: { icon: React.ElementType, label: string, src?: string | null }) => {
  if (!src) return null;
  return (
    <InfoRow icon={Icon} label={label}>
      <a href={src} target="_blank" rel="noopener noreferrer" className="block w-48">
        <Image src={src} alt={label} width={200} height={120} className="rounded-md object-cover border hover:opacity-80 transition-opacity" data-ai-hint="document id" />
      </a>
    </InfoRow>
  );
};

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
          <CardContent className="space-y-4 p-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="space-y-2 flex-grow">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
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
        <CardContent className="divide-y divide-border/50 p-0">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-primary mb-2 border-b pb-2">Хувийн мэдээлэл</h3>
                <ImageRow icon={Camera} label="Профайл зураг" src={anket.photoUrl} />
                <InfoRow icon={User} label="Нэр">{anket.name}</InfoRow>
                <InfoRow icon={Mail} label="Имэйл">{anket.email}</InfoRow>
                <InfoRow icon={Flag} label="Иргэншил">{anket.nationality}</InfoRow>
                
                <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-primary mt-6 mb-2 border-b pb-2">Холбоо барих</h3>
                <InfoRow icon={Phone} label="Хятад дахь утасны дугаар">{anket.chinaPhoneNumber}</InfoRow>
                <InfoRow icon={Smartphone} label="WeChat ID">{anket.wechatId}</InfoRow>
                <ImageRow icon={ScanLine} label="WeChat QR" src={anket.wechatQrImageUrl} />
                
                <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-primary mt-6 mb-2 border-b pb-2">Бичиг баримт</h3>
                <ImageRow icon={Camera} label="Иргэний үнэмлэхний урд тал" src={anket.idCardFrontImageUrl} />
                <ImageRow icon={Camera} label="Иргэний үнэмлэхний ар тал" src={anket.idCardBackImageUrl} />
                <ImageRow icon={Smile} label="Selfie зураг" src={anket.selfieImageUrl} />
                {anket.cvLink && <InfoRow icon={FileText} label="CV/Resume"><a href={anket.cvLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">Линк үзэх <Download className="ml-1 h-3 w-3" /></a></InfoRow>}

                <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-primary mt-6 mb-2 border-b pb-2">Орчуулгын туршлага</h3>
                <InfoRow icon={Briefcase} label="Орчуулагчаар ажиллаж байсан эсэх">{anket.workedAsTranslator ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}</InfoRow>
                <InfoRow icon={GraduationCap} label="Хэлний шалгалт өгсөн эсэх">{anket.chineseExamTaken ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}</InfoRow>
                <InfoRow icon={Languages} label="Ярианы түвшин">{anket.speakingLevel}</InfoRow>
                <InfoRow icon={Languages} label="Бичгийн түвшин">{anket.writingLevel}</InfoRow>
                <InfoRow icon={DollarSign} label="Өдрийн үнэлгээ (юань)">{anket.dailyRate}</InfoRow>
                <InfoRow icon={Award} label="Орчуулгын чиглэл">
                    <div className="flex flex-wrap gap-2">{anket.translationFields?.map(field => <Badge key={field} variant="secondary">{field}</Badge>)}</div>
                </InfoRow>

                <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-primary mt-6 mb-2 border-b pb-2">Байршил</h3>
                <InfoRow icon={Home} label="Одоо Хятадад байгаа эсэх">{anket.inChinaNow ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}</InfoRow>
                <InfoRow icon={Building} label="Одоогийн хот">{anket.currentCityInChinaName || 'N/A'}</InfoRow>
                <InfoRow icon={Globe} label="Ажиллах боломжтой бусад хотууд">
                    <div className="flex flex-wrap gap-2">{anket.canWorkInOtherCitiesNames?.map(name => <Badge key={name} variant="outline">{name}</Badge>)}</div>
                </InfoRow>
                <InfoRow icon={CalendarDays} label="Хятадад амьдарсан жил">{anket.yearsInChina}</InfoRow>

                <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-primary mt-6 mb-2 border-b pb-2">Бусад</h3>
                <InfoRow icon={MessageSquare} label="Нэмэлт мэдээлэл">{anket.message}</InfoRow>
                <InfoRow icon={Star} label="Дундаж үнэлгээ">{anket.averageRating?.toFixed(1)}</InfoRow>
                <InfoRow icon={CalendarDays} label="Илгээсэн огноо">{format(new Date(anket.submittedAt), "yyyy-MM-dd HH:mm:ss")}</InfoRow>
                {anket.processedAt && <InfoRow icon={Check} label="Боловсруулсан огноо">{format(new Date(anket.processedAt), "yyyy-MM-dd HH:mm:ss")}</InfoRow>}
            </div>
        </CardContent>
        {anket.status === AnketStatus.PENDING && (
          <CardFooter className="flex justify-end space-x-2 pt-6 border-t">
            <Button
              variant="destructive"
              onClick={() => handleUpdateStatus(AnketStatus.REJECTED)}
              disabled={isProcessing}
            >
              {isProcessing && anket.status === AnketStatus.REJECTED ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Татгалзах
            </Button>
            <Button
              variant="default"
              className="bg-green-500 hover:bg-green-600"
              onClick={() => handleUpdateStatus(AnketStatus.APPROVED)}
              disabled={isProcessing}
            >
              {isProcessing && anket.status === AnketStatus.APPROVED ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Зөвшөөрөх
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  );
}

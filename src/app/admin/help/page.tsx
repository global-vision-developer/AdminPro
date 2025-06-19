
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { HelpItem, HelpRequest } from '@/types';
import { HelpTopic } from '@/types';
import { getHelpItems, submitHelpRequest } from '@/lib/actions/helpActions';
import { Loader2, Send, HelpCircle, MessageSquarePlus, BookOpen, Plane } from 'lucide-react';

export default function HelpPage() {
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | undefined>(HelpTopic.APPLICATION_GUIDE);
  const [helpItems, setHelpItems] = useState<HelpItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchHelpItems = useCallback(async (topic?: HelpTopic) => {
    setIsLoadingItems(true);
    const items = await getHelpItems(topic);
    setHelpItems(items);
    setIsLoadingItems(false);
  }, []);

  useEffect(() => {
    fetchHelpItems(selectedTopic);
  }, [selectedTopic, fetchHelpItems]);

  const handleTopicChange = (topicValue: string) => {
    setSelectedTopic(topicValue as HelpTopic);
  };

  const handleSubmitNewQuestion = async () => {
    if (!newQuestion.trim()) {
      toast({ title: "Алдаа", description: "Асуултаа бичнэ үү.", variant: "destructive" });
      return;
    }
    if (!selectedTopic) {
      toast({ title: "Алдаа", description: "Эхлээд тусламжийн сэдэв сонгоно уу.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const result = await submitHelpRequest(selectedTopic, newQuestion);
    setIsSubmitting(false);

    if ("id" in result) {
      toast({ title: "Амжилттай", description: "Таны асуултыг амжилттай илгээлээ. Бид удахгүй хариулах болно." });
      setNewQuestion('');
      // Optionally, re-fetch user-submitted questions if displayed on this page, or navigate.
    } else {
      toast({ title: "Алдаа", description: result.error, variant: "destructive" });
    }
  };

  const getTopicIcon = (topic: HelpTopic | undefined) => {
    if (topic === HelpTopic.APPLICATION_GUIDE) return <BookOpen className="mr-2 h-5 w-5 text-primary" />;
    if (topic === HelpTopic.TRAVEL_TIPS) return <Plane className="mr-2 h-5 w-5 text-primary" />;
    return <HelpCircle className="mr-2 h-5 w-5 text-primary" />;
  }

  return (
    <>
      <PageHeader title="Тусламж, Дэмжлэг" description="Аппликэйшн ашиглах болон аялалтай холбоотой түгээмэл асуулт, хариултууд." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center">
                <HelpCircle className="mr-2 h-6 w-6 text-primary" />
                Тусламжийн сэдэв
              </CardTitle>
              <CardDescription>Сонирхож буй сэдвээ сонгоно уу.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={handleTopicChange} defaultValue={selectedTopic}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Сэдэв сонгоно уу..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(HelpTopic).map(topic => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center">
                <MessageSquarePlus className="mr-2 h-6 w-6 text-primary" />
                Шинэ асуулт илгээх
              </CardTitle>
              <CardDescription>Нийтлэг асуултаас хариултаа олоогүй бол эндээс асуугаарай.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Асуултаа энд бичнэ үү..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={5}
                className="text-base"
              />
              <Button onClick={handleSubmitNewQuestion} disabled={isSubmitting || !newQuestion.trim() || !selectedTopic} className="w-full">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Илгээх
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-lg min-h-[400px]">
            <CardHeader>
              <CardTitle className="font-headline flex items-center">
                {getTopicIcon(selectedTopic)}
                {selectedTopic || "Нийтлэг Асуулт Хариулт"}
              </CardTitle>
              <CardDescription>
                {selectedTopic ? `"${selectedTopic}" сэдэвтэй холбоотой нийтлэг асуулт, хариултууд.` : "Сэдэв сонгоно уу."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingItems ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : helpItems.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-3">
                  {helpItems.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="border bg-background rounded-md shadow-sm hover:shadow-md transition-shadow">
                      <AccordionTrigger className="p-4 text-left hover:no-underline focus:no-underline">
                        <span className="font-medium text-foreground">{item.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0">
                        <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
                          {item.answer}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {selectedTopic ? "Энэ сэдэвтэй холбоотой нийтлэг асуулт олдсонгүй." : "Харуулах асуулт, хариулт алга."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export const metadata = {
  title: "Тусламж | Админ Про",
};

    
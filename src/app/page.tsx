/**
 * @fileoverview This is the main landing page for unauthenticated users, serving as the login portal.
 * It handles the user login form, authentication logic via the `useAuth` hook, and redirects
 * authenticated users to the admin dashboard. It also includes the password reset functionality.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { sendAdminPasswordResetEmail } from "@/lib/actions/userActions";
import { Label } from "@/components/ui/label";


const loginSchema = z.object({
  email: z.string().email({ message: "И-мэйл хаяг буруу байна." }), 
  password: z.string().min(6, { message: "Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой." }), 
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  useEffect(() => {
    if (!loading && currentUser) {
      router.push('/admin/dashboard');
    }
  }, [currentUser, loading, router]);

  const handlePasswordReset = async () => {
    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
        toast({ title: "И-мэйл хаяг буруу байна", description: "Нууц үг сэргээх и-мэйл илгээхийн тулд зөв хаяг оруулна уу.", variant: "destructive" });
        return;
    }
    setIsSendingReset(true);
    const result = await sendAdminPasswordResetEmail(resetEmail);
    setIsSendingReset(false);

    if (result.success) {
        toast({ title: "И-мэйл илгээгдлээ", description: `Хэрэв ${resetEmail} хаяг бүртгэлтэй бол нууц үг сэргээх холбоос илгээгдсэн. Та ирсэн и-мэйлээ шалгана уу.` });
        setIsResetDialogOpen(false);
        setResetEmail("");
    } else {
        toast({ title: "Алдаа гарлаа", description: result.error, variant: "destructive" });
    }
  };


  if (loading || (!loading && currentUser)) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    await login(data.email, data.password); 
    setIsSubmitting(false); 
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
       <div className="absolute inset-0 overflow-hidden z-0">
      </div>
      <Card className="w-full max-w-md shadow-2xl z-10 border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Image src="https://placehold.co/80x80.png?bg=FF5733&text=AP" alt="Admin Pro Logo" width={80} height={80} className="rounded-lg" data-ai-hint="logo abstract"/>
          </div>
          <CardTitle className="text-3xl font-headline text-primary">Админ Про</CardTitle> 
          <CardDescription className="text-muted-foreground">
            Контентоо удирдахын тулд бүртгэлдээ нэвтэрнэ үү
          </CardDescription> 
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">И-мэйл хаяг</FormLabel> 
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        className="h-11 text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="password">Нууц үг</FormLabel> 
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="h-11 text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
               <div className="flex justify-end pt-1">
                  <Button type="button" variant="link" className="p-0 h-auto text-sm text-primary/90 hover:text-primary" onClick={() => setIsResetDialogOpen(true)}>
                    Нууц үгээ мартсан уу?
                  </Button>
              </div>

              <Button type="submit" className="w-full h-11 text-lg mt-6" disabled={isSubmitting || loading}>
                {isSubmitting || loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Нэвтрэх
              </Button> 
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-xs text-muted-foreground pt-4">
        </CardFooter>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Админ Про.
      </p>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Нууц үг сэргээх</AlertDialogTitle>
              <AlertDialogDescription>
                Бүртгэлтэй и-мэйл хаягаа оруулахад бид танд нууц үг сэргээх холбоос илгээх болно.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
                <Label htmlFor="reset-email">И-мэйл хаяг</Label>
                <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="mt-2"
                />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSendingReset}>Цуцлах</AlertDialogCancel>
              <AlertDialogAction onClick={handlePasswordReset} disabled={isSendingReset}>
                {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Илгээх
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </main>
  );
}

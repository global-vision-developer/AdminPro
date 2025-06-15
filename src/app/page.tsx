
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import Image from "next/image";

const loginSchema = z.object({
  email: z.string().email({ message: "Имэйл хаяг буруу байна." }),
  password: z.string().min(6, { message: "Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой." }),
  name: z.string().optional(), // Optional name field for new users if they sign up
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, currentUser, loading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });
  
  useEffect(() => {
    if (!loading && currentUser) {
      router.push('/admin/dashboard');
    }
  }, [currentUser, loading, router]);

  if (loading || (!loading && currentUser)) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    await login(data.email, data.password, data.name);
    // AuthContext handles navigation or error display
    setIsSubmitting(false); 
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
       <div className="absolute inset-0 overflow-hidden z-0">
        {/* Decorative background elements can be added here */}
      </div>
      <Card className="w-full max-w-md shadow-2xl z-10 border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Image src="https://placehold.co/80x80.png?bg=FF5733&text=АП" alt="Админ Про Logo" width={80} height={80} className="rounded-lg" data-ai-hint="logo abstract"/>
          </div>
          <CardTitle className="text-3xl font-headline text-primary">Админ Про</CardTitle>
          <CardDescription className="text-muted-foreground">
            Системд нэвтэрч контентоо удирдана уу
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Имэйл Хаяг</FormLabel>
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
                    <FormLabel htmlFor="password">Нууц Үг</FormLabel>
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name">Нэр (Шинээр бүртгүүлэх бол)</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Таны нэр"
                        {...field}
                        className="h-11 text-base"
                      />
                    </FormControl>
                    <FormDescription>Хэрэв бүртгэлгүй бол энэ нэрээр шинэ бүртгэл үүснэ.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-11 text-lg" disabled={isSubmitting || loading}>
                {isSubmitting || loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Нэвтрэх / Бүртгүүлэх
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-xs text-muted-foreground pt-6">
          <p>Туршилтаар: 'super@example.com' эсвэл 'sub@example.com' ашиглана уу.</p>
          <p>Нууц үг: 'password' (эсвэл өөрийн хүссэн 6-с дээш тэмдэгттэй нууц үг)</p>
        </CardFooter>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Админ Про.
      </p>
    </main>
  );
}

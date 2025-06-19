
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { BannerForm } from '../components/banner-form';

export default function NewBannerPage() {
  const router = useRouter();

  const handleFormSuccess = () => {
    router.push('/admin/banners');
  };

  return (
    <>
      <PageHeader
        title="Шинэ Баннер Нэмэх"
        description="Вебсайтад зориулж шинэ баннер үүсгэнэ үү."
      />
      <BannerForm onFormSubmitSuccess={handleFormSuccess} />
    </>
  );
}

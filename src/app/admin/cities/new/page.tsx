
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { CityForm } from '../components/city-form';

export default function NewCityPage() {
  const router = useRouter();

  const handleFormSuccess = () => {
    router.push('/admin/cities');
  };

  return (
    <>
      <PageHeader
        title="Шинэ Хот Нэмэх"
        description="Системд шинэ хотын мэдээлэл үүсгэнэ үү."
      />
      <CityForm onFormSubmitSuccess={handleFormSuccess} />
    </>
  );
}

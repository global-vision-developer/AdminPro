"use client";
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For action buttons like "Create New"
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 border-b pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="mt-4 sm:mt-0 sm:ml-4">{children}</div>}
      </div>
    </div>
  );
}

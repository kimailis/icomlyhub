import React from 'react';
import { getProfileServer } from '@/lib/server/api';
import { notFound } from 'next/navigation';
import CelebProfileView from './CelebProfileView';

export default async function CelebProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfileServer(id);

  if (!profile) {
    notFound();
  }

  return <CelebProfileView profile={profile} />;
}

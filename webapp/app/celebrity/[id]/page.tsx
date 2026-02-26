import React from 'react';
import { getProfileServer } from '@/lib/server/api';
import { notFound } from 'next/navigation';
import CelebProfileView from './CelebProfileView';
import { cookies } from 'next/headers';

export default async function CelebProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const plan = cookieStore.get('plan')?.value || 'free';
  
  const profile = await getProfileServer(id, plan);

  if (!profile) {
    notFound();
  }

  return <CelebProfileView profile={profile} />;
}

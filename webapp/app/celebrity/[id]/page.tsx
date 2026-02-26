import React from 'react';
import { getProfileServer } from '@/lib/server/api';
import { notFound } from 'next/navigation';
import CelebProfileView from './CelebProfileView';
import { getSecurePlan } from '@/lib/server/auth';

export default async function CelebProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getSecurePlan();
  
  const profile = await getProfileServer(id, plan);

  if (!profile) {
    notFound();
  }

  return <CelebProfileView profile={profile} />;
}

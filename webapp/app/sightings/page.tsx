import React from 'react';
import { getMapDataServer } from '@/lib/server/api';
import SightingsView from './SightingsView';
import { cookies } from 'next/headers';

export default async function SightingsPage() {
  const cookieStore = await cookies();
  const plan = cookieStore.get('plan')?.value || 'free';
  const initialSightings = await getMapDataServer(plan);

  return <SightingsView initialSightings={initialSightings} />;
}

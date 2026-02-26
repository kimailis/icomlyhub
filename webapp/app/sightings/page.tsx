import React from 'react';
import { getMapDataServer } from '@/lib/server/api';
import SightingsView from './SightingsView';
import { getSecurePlan } from '@/lib/server/auth';

export default async function SightingsPage() {
  const plan = await getSecurePlan();
  const initialSightings = await getMapDataServer(plan);

  return <SightingsView initialSightings={initialSightings} />;
}

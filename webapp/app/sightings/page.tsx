import React from 'react';
import { getMapDataServer } from '@/lib/server/api';
import SightingsView from './SightingsView';

export default async function SightingsPage() {
  const initialSightings = await getMapDataServer();

  return <SightingsView initialSightings={initialSightings} />;
}

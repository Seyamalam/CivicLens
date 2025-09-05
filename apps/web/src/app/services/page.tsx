import { Metadata } from 'next';
import { ServicesCatalog } from '@/components/services-catalog';

export const metadata: Metadata = {
  title: 'FeeCheck - Service Fee Catalog | CivicLens',
  description: 'Official government service fees and overcharge detection dashboard for transparency',
  keywords: ['government services', 'service fees', 'overcharge detection', 'transparency', 'Bangladesh'],
};

export default function ServicesPage() {
  return <ServicesCatalog />;
}
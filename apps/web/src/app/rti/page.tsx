import { Metadata } from 'next';
import { RTIRepository } from '@/components/rti-repository';

export const metadata: Metadata = {
  title: 'RTI Copilot - Public Repository | CivicLens',
  description: 'Public repository of Right to Information requests and outcomes for transparency',
  keywords: ['RTI', 'right to information', 'transparency', 'government accountability', 'Bangladesh'],
};

export default function RTIPage() {
  return <RTIRepository />;
}
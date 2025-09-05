import { Metadata } from 'next';
import { DemoFlow } from '@/components/demo-flow';

export const metadata: Metadata = {
  title: 'CivicLens Demo | Anti-Corruption Platform for Bangladesh',
  description: 'Interactive demonstration of CivicLens - Unified anti-corruption platform with 6 transparency modules',
  keywords: ['demo', 'anti-corruption', 'transparency', 'Bangladesh', 'civic tech', 'ProcureLens', 'FeeCheck', 'RTI', 'FairLine', 'PermitPath', 'WardWallet'],
};

export default function DemoPage() {
  return <DemoFlow />;
}
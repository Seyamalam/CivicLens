import { Metadata } from 'next';
import { BudgetDashboard } from '@/components/budget-dashboard';

export const metadata: Metadata = {
  title: 'WardWallet - Budget Transparency | CivicLens',
  description: 'Public budget transparency dashboard with district-wise analysis and project monitoring',
  keywords: ['budget transparency', 'public spending', 'project monitoring', 'Bangladesh', 'accountability'],
};

export default function BudgetsPage() {
  return <BudgetDashboard />;
}
import React from 'react';
import { ProcurementExplorer } from '@/components/procurement-explorer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Procurement Explorer - CivicLens',
  description: 'Explore public procurement data with risk analysis and transparency tools',
};

export default function ProcurementPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProcurementExplorer />
    </div>
  );
}
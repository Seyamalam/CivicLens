import { Metadata } from 'next';
import { DataExportCenter } from '@/components/data-export-center';

export const metadata: Metadata = {
  title: 'Data Export Center | CivicLens',
  description: 'Download transparency datasets in CSV, JSON, and PDF formats for accountability',
  keywords: ['data export', 'transparency', 'open data', 'accountability', 'Bangladesh'],
};

export default function ExportPage() {
  return <DataExportCenter />;
}
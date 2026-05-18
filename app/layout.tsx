import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BelajarBareng AI — Teman Belajar Personal',
  description:
    'Nggak ada lagi alasan nggak ngerti. Tanya aja ke BelajarBareng AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans bg-canvas">{children}</body>
    </html>
  );
}

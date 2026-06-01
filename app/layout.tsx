import type { Metadata } from 'next';
import './globals.css';
import ThemeToggle from '@/components/ThemeToggle';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'BelajarBareng AI — Teman Belajar Personal',
  description:
    'Nggak ada lagi alasan nggak ngerti. Tanya aja ke BelajarBareng AI.',
  robots: { index: false, follow: false },
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans bg-canvas">
        <ErrorBoundary>{children}</ErrorBoundary>
        <ThemeToggle />
      </body>
    </html>
  );
}

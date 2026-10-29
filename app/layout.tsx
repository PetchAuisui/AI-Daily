import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import './globals.css';

const thai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
});

export const metadata: Metadata = {
  title: 'AI Daily Budget',
  description: 'เพื่อนช่วยแบ่ง weekly token ของ AI ให้พอใช้ทั้งสัปดาห์',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={thai.variable}>
      <body>{children}</body>
    </html>
  );
}

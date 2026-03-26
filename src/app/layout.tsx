import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://drnon.app'),
  title: {
    default: 'DrNon',
    template: '%s | DrNon',
  },
  description:
    'Policy without product is theater. DrNon is a civic intelligence lab for sharper thinking, clearer communication, and Thailand Watch.',
  openGraph: {
    title: 'DrNon',
    description:
      'Policy without product is theater. Public intelligence outside the slide deck.',
    siteName: 'DrNon',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white">
        <Nav />
        {children}
      </body>
    </html>
  );
}

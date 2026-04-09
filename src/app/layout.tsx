import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nordstein CRM',
  description: 'Sales OS by Nordstein-Agency',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

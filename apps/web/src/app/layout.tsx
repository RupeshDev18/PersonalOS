import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal AI Operating System',
  description: 'Chief Agent & Specialized Multi-Agent Autonomous Operating System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased flex flex-col">{children}</body>
    </html>
  );
}

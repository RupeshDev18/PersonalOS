import type { Metadata } from 'next';
import { Sora, Manrope, Poppins } from 'next/font/google';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

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
    <html lang="en" className={`dark ${sora.variable} ${manrope.variable} ${poppins.variable}`}>
      <body className="min-h-screen bg-background text-slate-100 font-manrope antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}

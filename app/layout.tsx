import type { Metadata } from 'next';
import { Cormorant_Garamond, Spectral, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import CommandPalette from '@/components/CommandPalette';
import OperatorDock from '@/components/OperatorDock';
import GlobalKeyboardNav from '@/components/GlobalKeyboardNav';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Galaxy — the celestial registry of agents',
  description:
    'An atlas of every agent in the known galaxy. Passports, reputation, and missions — filed in the open, logged in perpetuity.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${spectral.variable} ${jetbrainsMono.variable}`}
    >
      <body className="grain-overlay">
        {children}
        <OperatorDock />
        <CommandPalette />
        <GlobalKeyboardNav />
      </body>
    </html>
  );
}

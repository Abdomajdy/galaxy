import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Galaxy — the agent social layer',
  description: 'Where AI agents build reputation, transparently.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

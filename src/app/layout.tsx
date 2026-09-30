import type {Metadata, Viewport} from 'next';
import './globals.css';
import {fontVariables} from '@/lib/fonts';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'SortFusion | Sorting Algorithm Visualizer',
  description:
    'Watch Quick, Merge, Heap, Shell, Insertion, Selection, Bubble and Cocktail sort compare and swap in real time. Step through, scrub the timeline, or sort your own numbers.',
  authors: [{name: 'Krishnendu Ghosal'}],
  openGraph: {
    type: 'website',
    title: 'SortFusion',
    description: 'Eight sorting algorithms, animated step by step.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0d14',
};

export default function RootLayout({
  children,
}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en" className={`dark ${fontVariables}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

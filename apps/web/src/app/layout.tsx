import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';
import Link from 'next/link';
import { Square } from 'lucide-react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { ThemeProvider } from '@/components/ThemeProvider';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

const ibmPlex = IBM_Plex_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ibm',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://behavioral-interview-coach.vercel.app'),
  title: 'Behavioral Coach | Structure',
  description: 'Honest feedback. Structural analysis. Human metrics.',
  openGraph: {
    title: 'Behavioral Coach | Structure',
    description: 'Honest feedback. Structural analysis. Human metrics.',
    url: '/',
    siteName: 'Behavioral Interview Coach',
    images: [
      {
        url: '/bic-logo.jpg?v=2',
        width: 1200,
        height: 630,
        alt: 'Behavioral Interview Coach Preview',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Behavioral Coach | Structure',
    description: 'Honest feedback. Structural analysis. Human metrics.',
    images: [
      {
        url: '/bic-logo.jpg?v=2',
        width: 1200,
        height: 630,
        alt: 'Behavioral Interview Coach Preview',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${ibmPlex.variable} font-body antialiased bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col border-x-8 border-background">
            {/* Physical bevel effect on sides if desired, or just standard full width */}

            {/* ARCHITECTURAL HEADER */}
            <nav className="border-b-2 border-primary/10 bg-background sticky top-0 z-50 h-20 flex items-center justify-between px-6 md:px-12 backdrop-blur-sm">
              <div className="flex items-center gap-12">
                <Link href="/" className="flex items-center gap-3 text-foreground group">
                  <div className="w-6 h-6 bg-primary text-background flex items-center justify-center rounded-sm">
                    <Square className="w-3 h-3 fill-current" />
                  </div>
                  <span className="font-sans font-bold text-xl tracking-tight uppercase group-hover:opacity-70 transition-opacity">
                    Coach<span className="text-muted-foreground">.ai</span>
                  </span>
                </Link>
                <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  <Link href="/dashboard" className="hover:text-foreground transition-colors">History</Link>
                  <Link href="/arena" className="hover:text-foreground transition-colors">Practice</Link>
                  <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
                  <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="hidden md:block px-4 py-2 border border-border text-xs font-bold uppercase tracking-widest hover:bg-secondary transition-colors">
                  Login
                </button>
              </div>
            </nav>

            {/* MAIN CONTENT AREA */}
            <main className="flex-grow relative flex flex-col max-w-[1920px] mx-auto w-full bg-background">
              {children}
            </main>

            {/* FOOTER */}
            <footer className="border-t-2 border-primary/10 py-12 bg-background">
              <div className="px-6 md:px-12 flex justify-between items-end">
                <div className="flex flex-col gap-2">
                  <span className="font-sans font-bold text-2xl uppercase text-foreground/20">Coach.ai</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">© 2025 // Built with Honesty</span>
                </div>
                <div className="flex gap-8 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <a href="#" className="hover:text-foreground">Manifesto</a>
                  <a href="#" className="hover:text-foreground">Materials</a>
                  <a href="#" className="hover:text-foreground">Legal</a>
                </div>
              </div>
            </footer>

          </div>
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ''} />
    </html>
  );
}
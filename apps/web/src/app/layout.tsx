import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';
import Link from 'next/link';
import { Square } from 'lucide-react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { auth } from '@/auth';
import { LoginButton } from '@/components/LoginButton';
import { UserMenu } from '@/components/UserMenu';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${ibmPlex.variable} font-body antialiased bg-background text-foreground`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <div className="min-h-screen flex flex-col">
              {/* HEADER */}
              <nav className="border-b border-border bg-background/90 sticky top-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 backdrop-blur-md">
                <div className="flex items-center gap-12">
                  <Link href="/" className="flex items-center gap-3 text-foreground group">
                    <div className="w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center rounded-md">
                      <Square className="w-3 h-3 fill-current" />
                    </div>
                    <span className="font-sans font-bold text-xl tracking-tight group-hover:opacity-70 transition-opacity">
                      Coach<span className="text-muted-foreground font-medium">.ai</span>
                    </span>
                  </Link>
                  <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
                    <Link href="/dashboard" className="hover:text-foreground transition-colors">History</Link>
                    <Link href="/arena" className="hover:text-foreground transition-colors">Practice</Link>
                    <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
                    <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {session?.user ? (
                    <UserMenu session={session} />
                  ) : (
                    <LoginButton />
                  )}
                </div>
              </nav>

              {/* MAIN CONTENT AREA */}
              <main className="flex-grow relative flex flex-col max-w-[1920px] mx-auto w-full bg-background">
                {children}
              </main>

              {/* FOOTER */}
              <footer className="border-t border-border py-12 bg-background">
                <div className="px-6 md:px-12 flex justify-between items-end">
                  <div className="flex flex-col gap-2">
                    <span className="font-sans font-bold text-xl text-foreground/30">Coach.ai</span>
                    <span className="text-sm text-muted-foreground">© 2025 // Built to build confidence</span>
                  </div>
                  <div className="flex gap-8 text-sm text-muted-foreground font-medium">
                    <a href="#" className="hover:text-foreground transition-colors">Manifesto</a>
                    <a href="#" className="hover:text-foreground transition-colors">Materials</a>
                    <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                  </div>
                </div>
              </footer>

            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ''} />
    </html>
  );
}
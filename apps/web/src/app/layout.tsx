import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { Sparkles, LayoutDashboard, Video } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Behavioral Coach AI',
  description: 'Master your soft skills with real-time AI feedback.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Add suppressHydrationWarning here
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <div className="min-h-screen flex flex-col bg-gray-50">

          {/* NAVIGATION BAR */}
          <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">

                {/* Left: Brand Logo */}
                <div className="flex items-center">
                  <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 group">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white transition-transform group-hover:scale-110">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span>Coach<span className="text-blue-600">AI</span></span>
                  </Link>
                </div>

                {/* Right: Navigation Links */}
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>

                  <Link
                    href="/arena"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all hover:shadow-md"
                  >
                    <Video className="w-4 h-4" />
                    New Session
                  </Link>
                </div>

              </div>
            </div>
          </nav>

          {/* MAIN CONTENT AREA */}
          <main className="flex-grow">
            {children}
          </main>

          {/* FOOTER */}
          <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Behavioral Coach AI. Built for excellence.
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}
import Link from 'next/link';
import { ArrowRight, Mic, Cpu, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* HERO SECTION */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-3xl py-32 sm:py-48 lg:py-56 text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
              New: Detailed Emotional Analytics Included.
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
            Master Your Presence with <span className="text-blue-600">AI Coaching</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 mb-10">
            Stop guessing how you come across. Our AI analyzes your micro-expressions, vocal tone, and confidence in real-time to help you interview, present, and communicate like a pro.
          </p>
          <div className="flex items-center justify-center gap-x-6">
            <Link
              href="/arena"
              className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all flex items-center gap-2 hover:shadow-lg"
            >
              Start Practice Session <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/dashboard" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors">
              View History <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* FEATURE GRID SECTION */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Analyze Everything</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to improve
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">

              {/* Feature 1 */}
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Mic className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Vocal Analysis
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Track your pacing, tone, and clarity to ensure your message lands with authority.
                </dd>
              </div>

              {/* Feature 2 */}
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Cpu className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Micro-Expression AI
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Detect hidden moments of stress, hesitation, or genuine confidence in your facial cues.
                </dd>
              </div>

              {/* Feature 3 */}
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <TrendingUp className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Progress Tracking
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Watch your scores improve over time with detailed session history and analytics.
                </dd>
              </div>

            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight, Scale, Brain, Crosshair } from 'lucide-react';


export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">

      {/* HERO SECTION */}
      <section className="relative px-6 py-24 md:py-32 lg:px-12 border-b border-border grid-bg">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">

          <div className="inline-block border border-border rounded-full px-4 py-1 mb-8 bg-surface/50 backdrop-blur-sm shadow-sm">
            <span className="font-sans font-medium text-sm text-muted-foreground">Behavioral AI Coach v2.0</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-sans font-bold tracking-tight leading-[1.1] mb-8 text-foreground max-w-4xl">
            Master the <br className="md:hidden" />
            <span className="text-muted-foreground">Behavioral Interview</span> with AI
          </h1>

          <p className="max-w-xl text-lg md:text-xl leading-relaxed text-muted-foreground font-medium mb-12">
            Practice in a safe, stress-free environment. Get objective feedback on your confidence, clarity, and pacing to build your interviewing skills.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/arena"
              className="stone-button inline-flex items-center justify-center gap-3 text-lg"
            >
              Start Practicing <ArrowUpRight className="w-5 h-5" />
            </Link>

            <Link
              href="/dashboard"
              className="stone-button-secondary inline-flex items-center justify-center gap-3 text-lg"
            >
              View History
            </Link>
          </div>

        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-b border-border">

        <FeatureColumn
          icon={<Scale className="w-8 h-8" />}
          title="Vocal Stability"
          desc="Analyze pacing and volume consistency to ensure your delivery matches your content."
        />

        <FeatureColumn
          icon={<Brain className="w-8 h-8" />}
          title="Cognitive Load"
          desc="Monitor transcript flow and identify excessive pause times to keep answers clear and concise."
        />

        <FeatureColumn
          icon={<Crosshair className="w-8 h-8" />}
          title="Expressiveness"
          desc="Track subtle shifts in facial expressions to understand how your non-verbal cues align with your words."
        />

      </section>




      {/* FOOTER CALL */}
      <section className="py-24 px-6 text-center bg-surface/30">
        <h2 className="text-3xl md:text-5xl font-sans font-bold tracking-tight mb-8">
          Ready to build your confidence?
        </h2>
        <Link
          href="/arena"
          className="stone-button inline-block text-lg"
        >
          Begin Practice Session
        </Link>
      </section>

    </div>
  );
}

function FeatureColumn({ icon, title, desc }: { icon: ReactNode, title: string, desc: string }) {
  return (
    <div className="p-12 hover:bg-surface transition-colors group">
      <div className="mb-6 text-foreground group-hover:text-accent transition-colors">{icon}</div>
      <h3 className="text-xl font-sans font-bold tracking-tight mb-4">{title}</h3>
      <p className="text-base text-muted-foreground leading-relaxed transition-colors">
        {desc}
      </p>
    </div>
  );
}
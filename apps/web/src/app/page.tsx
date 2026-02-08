import Link from 'next/link';
import { ArrowUpRight, Scale, Brain, Crosshair } from 'lucide-react';


export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">

      {/* HERO SECTION */}
      <section className="relative px-6 py-24 md:py-32 lg:px-12 border-b-2 border-border grid-bg">
        <div className="max-w-7xl mx-auto">

          <div className="inline-block border-2 border-primary px-4 py-1 mb-8 bg-white shadow-[4px_4px_0_0_rgba(41,37,36,1)]">
            <span className="font-sans font-bold uppercase tracking-widest text-xs">Behavioral Architecture v2.0</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-sans font-bold uppercase tracking-tighter leading-[0.9] mb-12 text-foreground">
            Ace the <br />
            <span className="text-muted-foreground">Behavioral Interview</span>
          </h1>

          <p className="max-w-2xl text-xl md:text-2xl leading-relaxed text-foreground/80 font-medium mb-12 border-l-4 border-accent pl-6">
            We don't do "tips". We provide structural analysis of your speaking patterns.
            Calibrate your confidence with <span className="font-bold border-b-2 border-accent">architectural precision</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <Link
              href="/arena"
              className="stone-button inline-flex items-center justify-center gap-3 text-lg"
            >
              Enter The Arena <ArrowUpRight className="w-5 h-5" />
            </Link>

            <Link
              href="/dashboard"
              className="stone-button-secondary inline-flex items-center justify-center gap-3 text-lg bg-white"
            >
              View History
            </Link>
          </div>

        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x-2 divide-border border-b-2 border-border">

        <FeatureColumn
          icon={<Scale className="w-8 h-8" />}
          title="The Foundation"
          desc="Vocal stability analysis to ensure your delivery can support heavy questioning."
        />

        <FeatureColumn
          icon={<Brain className="w-8 h-8" />}
          title="The Framework"
          desc="Cognitive load monitoring. We detect when your structural integrity is compromised."
        />

        <FeatureColumn
          icon={<Crosshair className="w-8 h-8" />}
          title="The Facade"
          desc="Micro-expression tracking. Ensure your external presentation matches your internal logic."
        />

      </section>




      {/* FOOTER CALL */}
      <section className="py-24 px-6 text-center bg-foreground text-background">
        <h2 className="text-4xl md:text-6xl font-sans font-bold uppercase tracking-tight mb-8">
          Build your presence.
        </h2>
        <Link
          href="/arena"
          className="inline-block bg-background text-foreground px-8 py-4 font-sans font-bold uppercase tracking-widest text-lg hover:bg-white transition-colors"
        >
          Begin Calibration
        </Link>
      </section>

    </div>
  );
}

function FeatureColumn({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-12 hover:bg-white transition-colors group">
      <div className="mb-6 text-foreground group-hover:text-accent transition-colors">{icon}</div>
      <h3 className="text-2xl font-sans font-bold uppercase tracking-tight mb-4">{title}</h3>
      <p className="text-lg text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
        {desc}
      </p>
    </div>
  );
}
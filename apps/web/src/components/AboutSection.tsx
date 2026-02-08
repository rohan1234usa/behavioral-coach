import Link from 'next/link';
import { ArrowUpRight, Github, Linkedin, Code2 } from 'lucide-react';

export default function AboutSection() {
    return (
        <section className="py-24 px-6 md:px-12 border-b-2 border-border bg-background">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-center bg-surface border-2 border-border p-8 md:p-12 gap-12 hover:shadow-[8px_8px_0_0_rgba(41,37,36,0.1)] transition-shadow duration-300">

                    {/* PROFILE IMAGE */}
                    <div className="relative shrink-0">
                        <div className="w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-primary/10 overflow-hidden bg-secondary relative z-10">
                            {/* 
                 TODO: Update src with actual profile image. 
                 Recommended size: 400x400px 
              */}
                            <img
                                src="/rohan-profile.png"
                                alt="Rohan Singh - Full Stack Developer"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Decorative Element */}
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/10 rounded-full blur-2xl -z-0"></div>
                    </div>

                    {/* TEXT CONTENT */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest mb-6">
                            <Code2 className="w-4 h-4" />
                            <span>The Architect</span>
                        </div>

                        <h2 className="text-3xl md:text-5xl font-sans font-bold uppercase tracking-tight mb-6 text-foreground">
                            Built by <br className="hidden md:block" />
                            <span className="text-muted-foreground">Rohan Singh</span>
                        </h2>

                        <div className="space-y-4 text-lg text-muted-foreground leading-relaxed font-medium mb-8 max-w-2xl">
                            <p>
                                Computer Science undergraduate at <span className="text-foreground font-semibold">UC Irvine</span> (Class of '27) with a relentless passion for AI/ML and Full Stack engineering.
                            </p>
                            <p>
                                This platform leverages the <span className="text-accent font-bold">Imentiv AI API</span>, utilizing core models I contributed to during my time with their engineering team. It represents the intersection of structural behavioral analysis and modern web architecture.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <a
                                href="https://built-by-rohan.vercel.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="stone-button inline-flex items-center justify-center gap-3"
                            >
                                View My Portfolio <ArrowUpRight className="w-4 h-4" />
                            </a>

                            <a
                                href="https://www.linkedin.com/in/rohan123/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="stone-button-secondary inline-flex items-center justify-center gap-3 bg-transparent"
                            >
                                <Linkedin className="w-4 h-4" />
                                Connect on LinkedIn
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}

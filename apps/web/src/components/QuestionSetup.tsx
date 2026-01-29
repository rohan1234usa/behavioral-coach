'use client';

import React, { useState } from 'react';
import { api } from '@/services/api';
import { Loader2, Briefcase, FileText, Sparkles, Pencil } from 'lucide-react';

interface QuestionSetupProps {
    onQuestionSelected: (question: string) => void;
}

export default function QuestionSetup({ onQuestionSelected }: QuestionSetupProps) {
    const [mode, setMode] = useState<'manual' | 'ai'>('ai');
    const [manualInput, setManualInput] = useState('');

    // AI State
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [resume, setResume] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
    const [selectedAiQuestion, setSelectedAiQuestion] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!company || !role) {
            alert("Please enter Company and Role");
            return;
        }
        setIsGenerating(true);
        try {
            const questions = await api.generateQuestions(company, role, resume || undefined);
            setGeneratedQuestions(questions);
        } catch (e) {
            console.error(e);
            alert("Failed to generate questions.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full max-w-2xl text-foreground">

            {/* TABS */}
            <div className="flex gap-4 mb-8 border-b-2 border-border pb-2">
                <button
                    onClick={() => setMode('ai')}
                    className={`flex items-center gap-2 pb-2 text-sm font-bold uppercase tracking-widest transition-colors ${mode === 'ai' ? 'text-accent border-b-4 border-accent mb-[-0.6rem]' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Sparkles className="w-4 h-4" /> AI Generator
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={`flex items-center gap-2 pb-2 text-sm font-bold uppercase tracking-widest transition-colors ${mode === 'manual' ? 'text-accent border-b-4 border-accent mb-[-0.6rem]' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Pencil className="w-4 h-4" /> Manual Input
                </button>
            </div>

            <div className="bg-surface border-2 border-border p-6 md:p-8 shadow-[8px_8px_0_0_rgba(0,0,0,0.2)]">

                {/* MANUAL MODE */}
                {mode === 'manual' && (
                    <div className="flex flex-col gap-4">
                        <label className="text-sm font-bold uppercase tracking-wide">Enter your question</label>
                        <textarea
                            className="w-full p-4 bg-background border-2 border-border focus:border-accent outline-none font-mono text-lg min-h-[150px]"
                            placeholder="Tell me about a time you failed..."
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                        />
                        <button
                            onClick={() => {
                                if (manualInput.trim()) onQuestionSelected(manualInput);
                            }}
                            className="mt-4 bg-foreground text-background py-4 font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                            disabled={!manualInput.trim()}
                        >
                            Start Session
                        </button>
                    </div>
                )}

                {/* AI MODE */}
                {mode === 'ai' && (
                    <div className="flex flex-col gap-6">

                        {/* INPUTS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                    <Briefcase className="w-4 h-4" /> Company
                                </label>
                                <input
                                    type="text"
                                    className="p-3 bg-background border-2 border-border focus:border-accent outline-none font-sans"
                                    placeholder="e.g. Google"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                    <Briefcase className="w-4 h-4" /> Role
                                </label>
                                <input
                                    type="text"
                                    className="p-3 bg-background border-2 border-border focus:border-accent outline-none font-sans"
                                    placeholder="e.g. Product Manager"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                <FileText className="w-4 h-4" /> Resume (PDF) <span className="text-accent opacity-50 ml-auto lowercase font-normal italic">Optional</span>
                            </label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setResume(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:border-2 file:border-border
                  file:text-sm file:font-semibold
                  file:bg-violet-50 file:text-foreground
                  hover:file:bg-violet-100 cursor-pointer"
                            />
                        </div>

                        {/* GENERATE BUTTON */}
                        {generatedQuestions.length === 0 && (
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full bg-stone-200 border-2 border-border py-3 font-bold uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                {isGenerating ? 'Analyzing Context...' : 'Generate Questions'}
                            </button>
                        )}

                        {/* RESULTS */}
                        {generatedQuestions.length > 0 && (
                            <div className="mt-4 animate-fade-in">
                                <h3 className="text-sm font-bold uppercase tracking-wide mb-4 text-accent">Select a Question</h3>
                                <div className="flex flex-col gap-3">
                                    {generatedQuestions.map((q, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedAiQuestion(q)}
                                            className={`p-4 border-2 cursor-pointer transition-all ${selectedAiQuestion === q ? 'border-accent bg-accent/5' : 'border-border hover:border-gray-400'}`}
                                        >
                                            <p className="font-medium">{q}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-4 mt-6">
                                    <button
                                        onClick={() => setGeneratedQuestions([])}
                                        className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (selectedAiQuestion) onQuestionSelected(selectedAiQuestion);
                                        }}
                                        disabled={!selectedAiQuestion}
                                        className="flex-[2] bg-foreground text-background py-3 font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        Start Interview
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                )}

            </div>
        </div>
    );
}

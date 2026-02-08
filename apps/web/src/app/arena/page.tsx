'use client';

import { useState } from 'react';
import ArenaRecorder from '@/components/ArenaRecorder';
import QuestionSetup from '@/components/QuestionSetup';

export default function ArenaPage() {
    const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

    return (
        <div className="min-h-[calc(100vh-64px)] bg-background flex flex-col items-center justify-center p-4">

            {/* Workspace Header */}
            {!selectedQuestion && (
                <div className="text-center mb-8 animate-fade-in-up">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Practice Arena</h1>
                    <p className="text-muted-foreground">
                        Design your interview context.
                    </p>
                </div>
            )}

            {/* The Component Wrapper */}
            <div className={`w-full ${selectedQuestion ? 'max-w-4xl' : 'max-w-2xl'} transition-all duration-500`}>
                {!selectedQuestion ? (
                    <QuestionSetup onQuestionSelected={setSelectedQuestion} />
                ) : (
                    <div className="bg-card/50 p-1 rounded-2xl shadow-2xl backdrop-blur-sm border border-border animate-in fade-in zoom-in duration-300">
                        <ArenaRecorder initialQuestion={selectedQuestion} />
                    </div>
                )}
            </div>

        </div>
    );
}
'use client';

import { useState } from 'react';
import ArenaRecorder from '@/components/ArenaRecorder';
import QuestionSetup from '@/components/QuestionSetup';

export default function ArenaPage() {
    const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-900 flex flex-col items-center justify-center p-4">

            {/* Workspace Header */}
            {!selectedQuestion && (
                <div className="text-center mb-8 animate-fade-in-up">
                    <h1 className="text-3xl font-bold text-white mb-2">Practice Arena</h1>
                    <p className="text-gray-400">
                        Design your interview context.
                    </p>
                </div>
            )}

            {/* The Component Wrapper */}
            <div className={`w-full ${selectedQuestion ? 'max-w-4xl' : 'max-w-2xl'} transition-all duration-500`}>
                {!selectedQuestion ? (
                    <QuestionSetup onQuestionSelected={setSelectedQuestion} />
                ) : (
                    <div className="bg-gray-800/50 p-1 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700 animate-in fade-in zoom-in duration-300">
                        <ArenaRecorder initialQuestion={selectedQuestion} />
                    </div>
                )}
            </div>

        </div>
    );
}
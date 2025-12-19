import ArenaRecorder from '@/components/ArenaRecorder';

export default function ArenaPage() {
    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-900 flex flex-col items-center justify-center p-4">

            {/* Workspace Header */}
            <div className="text-center mb-8 animate-fade-in-up">
                <h1 className="text-3xl font-bold text-white mb-2">Practice Arena</h1>
                <p className="text-gray-400">
                    This is a safe space. Record your answer, and let AI do the rest.
                </p>
            </div>

            {/* The Recorder Component Wrapper */}
            <div className="w-full max-w-4xl bg-gray-800/50 p-1 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700">
                <ArenaRecorder />
            </div>

        </div>
    );
}
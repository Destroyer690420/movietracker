/**
 * A small, self-dismissing message used for things like "you can only pin
 * four films" or "migrated 12 titles".
 */
export default function Toast({ message, onDismiss }) {
    if (!message) {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-enter">
            <div className="flex items-center gap-4 bg-[#111] border border-[#2a2a2a] px-5 py-3 shadow-2xl">
                <p className="text-xs text-[#aaa] font-light tracking-wide">{message}</p>
                <button
                    onClick={onDismiss}
                    className="text-[#444] hover:text-white transition-colors"
                    aria-label="Dismiss"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

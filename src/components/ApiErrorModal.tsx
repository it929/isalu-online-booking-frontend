import React from "react";
import { X, AlertCircle, RefreshCw } from "lucide-react";

interface ApiErrorModalProps {
    error: string | null;
    onClose: () => void;
    onRetry?: () => void;
}

export function ApiErrorModal({ error, onClose, onRetry }: ApiErrorModalProps) {
    if (!error) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
                <div className="absolute top-4 right-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20 shadow-inner">
                    <AlertCircle className="h-7 w-7" />
                </div>

                <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">System Connection Notice</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                        {error}
                    </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex-1 py-3 px-4 bg-[#008ac9] hover:bg-[#0072b1] text-white font-semibold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Try Again
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
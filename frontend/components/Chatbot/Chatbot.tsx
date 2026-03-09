"use client";

import { useState, useRef, useEffect } from "react";
import { postChat } from "@/lib/api";

export interface ChatbotProps {
  selectedEngineer: string | null;
}

export function Chatbot({ selectedEngineer }: ChatbotProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-chatbot-button]")) setOpen(false);
      }
    };
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await postChat(q, selectedEngineer);
      setAnswer(res.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        data-chatbot-button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg bg-posthog-orange text-white flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Open chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-full max-w-md rounded-xl border border-[var(--border-default)] bg-card shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-primary">
            <h3 className="font-semibold text-primary">Ask about impact</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded text-muted hover:text-primary"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {selectedEngineer && (
            <p className="px-4 py-1.5 text-sm text-muted border-b border-[var(--border-default)]">
              Context: <span className="font-mono font-medium text-primary">{selectedEngineer}</span>
            </p>
          )}
          <div className="p-4 max-h-60 overflow-y-auto">
            {error && (
              <p className="text-sm text-red-500 mb-2">{error}</p>
            )}
            {answer !== null && (
              <div className="text-sm text-primary whitespace-pre-wrap mb-4">{answer}</div>
            )}
            <form onSubmit={handleSubmit}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. How is impact calculated?"
                rows={2}
                className="w-full rounded-lg border border-[var(--border-default)] bg-primary text-primary placeholder:text-muted p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="mt-2 w-full py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

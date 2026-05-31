import React from 'react';
import { Eye, Terminal } from 'lucide-react';

export default function Header({ onReset, hasData, isResetting }) {
  return (
    <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
              CreatorLens
            </span>
            <span className="ml-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
              RAG v1.0
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {hasData && (
            <button
              onClick={onReset}
              disabled={isResetting}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Terminal className="w-3.5 h-3.5" />
              {isResetting ? 'Resetting...' : 'Reset Compare Session'}
            </button>
          )}
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-400 font-semibold tracking-wider uppercase">
              System Ready
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

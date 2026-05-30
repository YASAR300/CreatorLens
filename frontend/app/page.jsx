'use client';

import React, { useState } from 'react';
import Header from '../components/Header';
import VideoCard from '../components/VideoCard';
import ChatInterface from '../components/ChatInterface';
import { 
  Sparkles, Link2, Youtube, Instagram, PlayCircle, BarChart3, RefreshCw, 
  Terminal, ShieldCheck, CheckCircle2, ChevronRight, HelpCircle 
} from 'lucide-react';

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState([]);
  const [error, setError] = useState(null);
  
  const [videoA, setVideoA] = useState(null);
  const [videoB, setVideoB] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  // Quick preset loading for demonstration
  const handleLoadPresets = () => {
    setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    setInstagramUrl('https://www.instagram.com/reel/C42n-b0xX3y/');
  };

  const addLog = (message) => {
    setLoadingLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: message }]);
  };

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!youtubeUrl || !instagramUrl || loading) return;

    setLoading(true);
    setError(null);
    setLoadingLogs([]);

    addLog("Initializing CreatorLens ingestion pipeline...");
    addLog("Validating social media URLs...");

    try {
      // Simulate real-time logs because the backend processes multiple steps
      setTimeout(() => addLog("Sending scraping jobs to FastAPI backend at port 8000..."), 800);
      setTimeout(() => addLog("Scraping YouTube Video A (views, likes, comments)..."), 1800);
      setTimeout(() => addLog("Attempting YouTube transcript lookup..."), 3000);
      setTimeout(() => addLog("Scraping Instagram Reel Video B (likes, comments, caption)..."), 4200);
      setTimeout(() => addLog("Retrieving Instagram followers count from post.owner_profile..."), 5500);
      setTimeout(() => addLog("Downloading Instagram Reels audio track locally using yt-dlp..."), 7000);
      setTimeout(() => addLog("Sending Reels audio to Groq Whisper API (whisper-large-v3)..."), 8500);
      setTimeout(() => addLog("Transcribing audio segments with word timestamps..."), 10500);
      setTimeout(() => addLog("Performing semantic text splitting (500 chars, 50 overlap)..."), 12000);
      setTimeout(() => addLog("Creating vector embeddings using local sentence-transformers model..."), 13500);
      setTimeout(() => addLog("Storing index chunks tagged with video_id (A / B) in ChromaDB..."), 15000);
      setTimeout(() => addLog("Finalizing vector DB persistence..."), 16500);

      const response = await fetch('http://127.0.0.1:8000/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          instagram_url: instagramUrl
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Inference server failed during ingestion.");
      }

      const data = await response.json();
      
      addLog("Synchronized comparison stats. Ingestion Successful!");
      setVideoA(data.video_a);
      setVideoB(data.video_b);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to parse metadata and transcripts. Check backend server logs.");
      addLog("CRITICAL ERROR: Ingestion process aborted.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat/reset', {
        method: 'POST',
      });
      if (response.ok) {
        setVideoA(null);
        setVideoB(null);
        setYoutubeUrl('');
        setInstagramUrl('');
        setLoadingLogs([]);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to reset session", err);
    } finally {
      setIsResetting(false);
    }
  };

  const hasData = !!(videoA && videoB);

  return (
    <div className="min-h-screen bg-black text-neutral-200 selection:bg-indigo-500 selection:text-white flex flex-col font-sans antialiased">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/15 via-black to-black pointer-events-none z-0" />
      
      {/* Header component */}
      <Header onReset={handleResetSession} hasData={hasData} isResetting={isResetting} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 z-10 relative">
        {!hasData ? (
          /* ================= INGESTION SETUP PHASE ================= */
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-8 my-auto py-12">
            {/* Title & Introduction */}
            <div className="text-center flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-400 tracking-wide">
                <Sparkles className="w-3.5 h-3.5" /> High-Performance RAG Platform
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-1 bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
                Analyze Social Growth with RAG
              </h1>
              <p className="text-sm sm:text-base text-neutral-400 max-w-lg mt-2 font-medium">
                CreatorLens fetches video transcripts, scrapes engagement metrics, and uses a local vector DB to help you understand what makes content go viral.
              </p>
            </div>

            {/* Ingestion URL Form */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full pointer-events-none" />
              
              <form onSubmit={handleIngest} className="flex flex-col gap-6">
                {/* Youtube URL Input */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="youtube" className="text-xs uppercase font-extrabold text-neutral-400 tracking-wider flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-500" /> YouTube Video URL (Video A)
                  </label>
                  <div className="flex items-center gap-3 bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 focus-within:border-indigo-500 transition duration-300">
                    <Link2 className="w-4 h-4 text-neutral-600" />
                    <input
                      id="youtube"
                      type="url"
                      required
                      disabled={loading}
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="bg-transparent border-0 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 outline-none w-full select-text"
                    />
                  </div>
                </div>

                {/* Instagram URL Input */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="instagram" className="text-xs uppercase font-extrabold text-neutral-400 tracking-wider flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-500" /> Instagram Reel URL (Video B)
                  </label>
                  <div className="flex items-center gap-3 bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 focus-within:border-indigo-500 transition duration-300">
                    <Link2 className="w-4 h-4 text-neutral-600" />
                    <input
                      id="instagram"
                      type="url"
                      required
                      disabled={loading}
                      placeholder="https://www.instagram.com/reel/..."
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      className="bg-transparent border-0 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 outline-none w-full select-text"
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:flex-1 py-3.5 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Synchronizing Video Data...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4" />
                        Analyze & Ingest Creator Data
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleLoadPresets}
                    disabled={loading}
                    className="w-full sm:w-auto px-5 py-3.5 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl font-bold text-xs text-neutral-400 hover:text-white transition duration-200 cursor-pointer disabled:opacity-50"
                  >
                    Load Free Demo Presets
                  </button>
                </div>
              </form>
            </div>

            {/* Live Progress Logs for Loading */}
            {loadingLogs.length > 0 && (
              <div className="bg-neutral-950/60 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 relative">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs uppercase font-extrabold text-neutral-400 tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" /> Ingestion Terminal Logs
                  </span>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                </div>
                
                <div className="h-44 overflow-y-auto font-mono text-[11px] text-neutral-400 flex flex-col gap-1.5 scrollbar-thin">
                  {loadingLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-3 hover:text-neutral-200 transition duration-100">
                      <span className="text-neutral-600 flex-shrink-0">[{log.time}]</span>
                      <span className="flex-shrink-0 text-indigo-500">&gt;</span>
                      <span className="leading-relaxed">{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 shadow-2xl text-xs text-red-400 flex flex-col gap-1.5 animate-shake">
                <h3 className="font-extrabold uppercase tracking-wider text-red-500">Pipeline Execution Error</h3>
                <p className="leading-relaxed font-semibold">{error}</p>
                <p className="text-[10px] text-neutral-500 mt-1">Make sure the FastAPI backend is running locally on port 8000 and your GROQ_API_KEY environment variable is valid.</p>
              </div>
            )}
          </div>
        ) : (
          /* ================= ACTIVE COMPARISON DASHBOARD ================= */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch h-full">
            {/* Left side: Video Comparison Cards */}
            <div className="lg:col-span-6 flex flex-col gap-6 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-black text-xl text-white tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-400" /> Comparison Deck
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">Metrics synced dynamically from public scraping</p>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase rounded-full flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Persisted In ChromaDB
                </div>
              </div>

              <div className="flex flex-col gap-6 overflow-y-auto lg:max-h-[750px] scrollbar-thin">
                <VideoCard video={videoA} label="Video A" />
                <VideoCard video={videoB} label="Video B" />
              </div>
            </div>

            {/* Right side: RAG Streaming Chatbot Interface */}
            <div className="lg:col-span-6 h-full flex flex-col">
              <ChatInterface videoA={videoA} videoB={videoB} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

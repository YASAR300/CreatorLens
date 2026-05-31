'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { processVideos } from "../lib/api";

/**
 * Processing step messages shown during the 30–90s ingestion wait.
 * Without these the UI looks frozen; cycling them communicates progress.
 */
export const PROCESSING_STEPS = [
  { delay: 0, message: "Connecting to YouTube…" },
  { delay: 2000, message: "Fetching video metadata and transcript…" },
  { delay: 5000, message: "Connecting to Instagram…" },
  { delay: 8000, message: "Downloading reel audio…" },
  { delay: 12000, message: "Transcribing audio with Groq Whisper…" },
  { delay: 45000, message: "Generating semantic embeddings…" },
  { delay: 60000, message: "Indexing to Qdrant…" },
];

/**
 * useVideoProcessor — owns the entire video-processing flow so page.jsx stays
 * a thin rendering layer. Independently testable.
 */
export function useVideoProcessor() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState(null);
  const [videoA, setVideoA] = useState(null);
  const [videoB, setVideoB] = useState(null);
  // One render cycle after data lands, flip this to trigger staggered entrance.
  const [videosLoaded, setVideosLoaded] = useState(false);

  const stepTimers = useRef([]);

  const clearTimers = useCallback(() => {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  }, []);

  const startStepMessages = useCallback(() => {
    clearTimers();
    PROCESSING_STEPS.forEach(({ delay, message }) => {
      const id = setTimeout(() => setProcessingStep(message), delay);
      stepTimers.current.push(id);
    });
  }, [clearTimers]);

  // Trigger entrance animation 50ms after both videos populate (DOM exists).
  useEffect(() => {
    if (!videoA || !videoB) return;
    const t = setTimeout(() => setVideosLoaded(true), 50);
    return () => clearTimeout(t);
  }, [videoA, videoB]);

  // Cleanup timers if the component unmounts mid-processing.
  useEffect(() => clearTimers, [clearTimers]);

  const analyze = useCallback(
    async (onSuccess) => {
      if (!youtubeUrl.trim() || !instagramUrl.trim() || isProcessing) return;

      setIsProcessing(true);
      setError(null);
      setVideosLoaded(false);
      startStepMessages();
      const tid = toast.loading("Analyzing videos… (30–90 seconds)");

      try {
        const data = await processVideos(youtubeUrl, instagramUrl);
        setVideoA(data.video_a);
        setVideoB(data.video_b);
        const total =
          (data.video_a?.chunks_stored || 0) + (data.video_b?.chunks_stored || 0);
        toast.success(`Done! ${total} chunks indexed in Qdrant.`, { id: tid });
        onSuccess?.(data);
      } catch (err) {
        const msg = err?.message || "Processing failed. Check backend logs.";
        setError(msg);
        toast.error(msg, { id: tid });
      } finally {
        clearTimers();
        setIsProcessing(false);
        setProcessingStep("");
      }
    },
    [youtubeUrl, instagramUrl, isProcessing, startStepMessages, clearTimers]
  );

  const reset = useCallback(() => {
    clearTimers();
    setVideoA(null);
    setVideoB(null);
    setVideosLoaded(false);
    setYoutubeUrl("");
    setInstagramUrl("");
    setError(null);
    setProcessingStep("");
  }, [clearTimers]);

  // Load a saved analysis's cards directly (bypasses scraping).
  const loadVideos = useCallback((va, vb) => {
    clearTimers();
    setError(null);
    setProcessingStep("");
    setIsProcessing(false);
    setVideosLoaded(false);
    setVideoA(va || null);
    setVideoB(vb || null);
  }, [clearTimers]);

  return {
    youtubeUrl,
    setYoutubeUrl,
    instagramUrl,
    setInstagramUrl,
    isProcessing,
    processingStep,
    error,
    videoA,
    videoB,
    videosLoaded,
    analyze,
    reset,
    loadVideos,
  };
}

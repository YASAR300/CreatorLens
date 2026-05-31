'use client';

import { useState, useRef, useCallback } from "react";
import { streamChatMessage } from "../lib/api";

/**
 * useStreamingChat — owns the chat message list and the SSE stream lifecycle.
 * ChatInterface.jsx consumes this and only renders; no fetch logic in the view.
 */
export function useStreamingChat() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef(null); // active { cancel } handle
  const lastQuestionRef = useRef(""); // for Retry
  const analysisIdRef = useRef("default"); // active analysis to chat against

  // Let the parent point chat at a specific saved analysis.
  const setAnalysisId = useCallback((id) => {
    analysisIdRef.current = id || "default";
  }, []);

  const patch = useCallback((id, updater) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updater(m) } : m))
    );
  }, []);

  const sendMessage = useCallback(
    (textOverride) => {
      const query = (textOverride ?? "").trim();
      if (!query || isStreaming) return;

      lastQuestionRef.current = query;
      setIsStreaming(true);

      const userMsg = { id: `u-${Date.now()}`, sender: "user", text: query };
      const botId = `b-${Date.now()}`;
      const botMsg = {
        id: botId,
        sender: "bot",
        text: "",
        citations: [],
        isStreaming: true,
        error: false,
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);

      streamRef.current = streamChatMessage(query, {
        analysisId: analysisIdRef.current,
        onToken: (token) =>
          patch(botId, (m) => ({ text: m.text + token })),
        onSources: (sources) =>
          patch(botId, () => ({ citations: sources })),
        onDone: () => {
          patch(botId, () => ({ isStreaming: false }));
          setIsStreaming(false);
          streamRef.current = null;
        },
        onError: (msg) => {
          patch(botId, (m) => ({
            text: m.text || msg,
            isStreaming: false,
            error: true,
          }));
          setIsStreaming(false);
          streamRef.current = null;
        },
      });
    },
    [isStreaming, patch]
  );

  // Stop: cancel the reader, mark not-streaming, append a subtle stopped marker.
  const stopStreaming = useCallback(() => {
    streamRef.current?.cancel();
    streamRef.current = null;
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming
          ? { ...m, isStreaming: false, text: (m.text || "") + " ●" }
          : m
      )
    );
  }, []);

  // Retry: drop the failed bot turn (and its user turn) and re-ask.
  const retryLast = useCallback(() => {
    const q = lastQuestionRef.current;
    if (!q || isStreaming) return;
    setMessages((prev) => {
      const next = [...prev];
      // remove trailing bot (error) message
      if (next.length && next[next.length - 1].sender === "bot") next.pop();
      // remove its user message too so sendMessage re-adds a clean pair
      if (next.length && next[next.length - 1].sender === "user") next.pop();
      return next;
    });
    // defer so state settles before re-adding the pair
    setTimeout(() => sendMessage(q), 0);
  }, [isStreaming, sendMessage]);

  const clearChat = useCallback(() => {
    streamRef.current?.cancel();
    streamRef.current = null;
    setIsStreaming(false);
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    retryLast,
    clearChat,
    setAnalysisId,
  };
}

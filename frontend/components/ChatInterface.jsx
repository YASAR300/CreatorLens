import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, RefreshCw, PlayCircle, ExternalLink, HelpCircle } from 'lucide-react';

const SUGGESTIONS = [
  "Why did Video A get more engagement than Video B?",
  "What's the engagement rate of each?",
  "Compare the hooks in the first 5 seconds.",
  "Who's the creator of Video B and what's their follower count?",
  "Suggest improvements for B based on what worked in A."
];

export default function ChatInterface({ videoA, videoB }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hey! I'm your CreatorLens Strategy Assistant. Both Video A and Video B have been successfully transcribed and indexed into ChromaDB. Ask me anything to compare their hook strength, loopability, viewer retention strategies, or calculated engagement stats!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom as text streams
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || isStreaming) return;

    if (!textToSend) {
      setInput('');
    }
    setError(null);

    // 1. Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // 2. Prepare streaming bot message placeholder
    const botMsgId = `bot-${Date.now()}`;
    const botPlaceholder = {
      id: botMsgId,
      sender: 'bot',
      text: '',
      citations: [],
      timestamp: new Date(),
      isStreaming: true
    };
    setMessages(prev => [...prev, botPlaceholder]);
    setIsStreaming(true);

    try {
      // Create EventSource request for GET /api/chat?query=...
      const encodedQuery = encodeURIComponent(queryText);
      const url = `http://127.0.0.1:8000/api/chat?query=${encodedQuery}`;
      
      const eventSource = new EventSource(url);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'citations') {
            // Store citations directly into the streaming message
            setMessages(prev => prev.map(msg => {
              if (msg.id === botMsgId) {
                return { ...msg, citations: data.citations };
              }
              return msg;
            }));
          } 
          else if (data.type === 'content') {
            // Append token delta to text block
            setMessages(prev => prev.map(msg => {
              if (msg.id === botMsgId) {
                return { ...msg, text: msg.text + data.delta };
              }
              return msg;
            }));
          } 
          else if (data.type === 'error') {
            setError(data.content);
            eventSource.close();
            setIsStreaming(false);
            setMessages(prev => prev.map(msg => {
              if (msg.id === botMsgId) {
                return { ...msg, isStreaming: false, text: msg.text + `\n\n[Error: ${data.content}]` };
              }
              return msg;
            }));
          } 
          else if (data.type === 'done') {
            eventSource.close();
            setIsStreaming(false);
            setMessages(prev => prev.map(msg => {
              if (msg.id === botMsgId) {
                return { ...msg, isStreaming: false };
              }
              return msg;
            }));
          }
        } catch (parseErr) {
          console.error("Failed to parse SSE payload", parseErr);
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource encountered an error", err);
        setError("Connection lost to RAG backend stream.");
        eventSource.close();
        setIsStreaming(false);
        setMessages(prev => prev.map(msg => {
          if (msg.id === botMsgId) {
            return { ...msg, isStreaming: false, text: msg.text ? msg.text : "Failed to load response from backend API." };
          }
          return msg;
        }));
      };

    } catch (err) {
      setError(err.message || "Failed to initialize RAG Stream.");
      setIsStreaming(false);
    }
  };

  const getPlatformIcon = (platform) => {
    return platform === 'youtube' ? 'YouTube' : 'Instagram Reel';
  };

  // Convert inline citations like [Video A, 01:15] to interactive hover triggers
  const formatMessageText = (text) => {
    if (!text) return "";
    
    // Regular expression to match standard citation tags: [Video A, 01:15] or [Video A, Metadata]
    const parts = text.split(/(\[Video [A|B], [^\]]+\])/g);
    
    return parts.map((part, idx) => {
      const match = part.match(/\[Video ([A|B]), ([^\]]+)\]/);
      if (match) {
        const videoId = match[1];
        const sourceDetails = match[2];
        const isA = videoId === 'A';
        
        return (
          <span 
            key={idx}
            className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[10px] font-bold border cursor-pointer select-none transition ${
              isA 
                ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20' 
                : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20'
            }`}
            title={`Referenced source: Video ${videoId} at ${sourceDetails}`}
          >
            Video {videoId} ({sourceDetails})
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[650px] sm:h-full bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Interface Title */}
      <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-neutral-200">
            RAG Strategy Advisor
          </h2>
        </div>
        
        {isStreaming && (
          <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1.5 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
            LLM is Thinking...
          </span>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 scrollbar-thin">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div 
              key={msg.id} 
              className={`flex flex-col gap-1.5 max-w-[85%] ${isBot ? 'self-start' : 'self-end items-end'}`}
            >
              {/* Sender Tag */}
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest px-1">
                {isBot ? 'CreatorLens AI' : 'Creator'}
              </span>

              {/* Message Bubble */}
              <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border transition-all duration-300 ${
                isBot 
                  ? 'bg-neutral-900/60 text-neutral-300 border-white/5 rounded-tl-sm' 
                  : 'bg-gradient-to-br from-indigo-600/90 to-indigo-700/90 text-white border-indigo-500/10 rounded-tr-sm shadow-lg shadow-indigo-500/5'
              }`}>
                <div className="whitespace-pre-line">
                  {isBot ? formatMessageText(msg.text) : msg.text}
                </div>

                {/* Inline streaming visual indicator */}
                {msg.isStreaming && msg.text === "" && (
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>

              {/* Citations block for bot response */}
              {isBot && msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1.5 px-1">
                  <span className="text-[9px] font-extrabold uppercase text-neutral-500 tracking-wider flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-neutral-600" /> Reference Citations
                  </span>
                  <div className="flex flex-wrap gap-2 max-w-full">
                    {msg.citations.map((cit, idx) => {
                      const isA = cit.video_id === 'A';
                      const sourceName = isA ? (videoA?.creator || 'Video A') : (videoB?.creator || 'Video B');
                      
                      return (
                        <a
                          key={idx}
                          href={cit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center gap-1.5 transition-all duration-200 ${
                            isA 
                              ? 'bg-indigo-500/5 text-indigo-400 hover:text-indigo-300 border-indigo-500/10 hover:bg-indigo-500/10' 
                              : 'bg-purple-500/5 text-purple-400 hover:text-purple-300 border-purple-500/10 hover:bg-purple-500/10'
                          }`}
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Video {cit.video_id} ({cit.timestamp})</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          
                          {/* Hover Citation Preview */}
                          <span className="sr-only">{cit.content}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* RAG Suggestions Container */}
      {messages.length === 1 && !isStreaming && (
        <div className="px-6 py-3 bg-white/[0.01] border-t border-white/5">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
            Suggested Analysis Questions:
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(sug)}
                className="text-[10px] font-semibold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer text-left line-clamp-1"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-6 my-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Streaming Error:</span> {error}
          </div>
        </div>
      )}

      {/* Chat Form Area */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-6 border-t border-white/5 bg-white/[0.01]"
      >
        <div className="flex items-center gap-3 bg-neutral-950/80 border border-white/10 rounded-2xl px-4 py-2 hover:border-white/20 focus-within:border-indigo-500 transition duration-300">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={isStreaming ? "AI is replying..." : "Ask CreatorLens a strategy question..."}
            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 outline-none select-text py-2"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition duration-200"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

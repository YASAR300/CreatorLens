import React, { useState } from 'react';
import { 
  Eye, Heart, MessageSquare, Users, 
  Calendar, Clock, Hash, Youtube, Instagram, FileText, ChevronDown, ChevronUp 
} from 'lucide-react';

export default function VideoCard({ video, label }) {
  const [showTranscript, setShowTranscript] = useState(false);

  // Formatting utilities
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const isYoutube = video?.platform === 'youtube';

  if (!video) return null;

  return (
    <div className="w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl hover:border-white/20 transition-all duration-300 flex flex-col gap-6 relative overflow-hidden group">
      {/* Platform Highlight Badge */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full pointer-events-none" />
      
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-xs font-bold uppercase rounded-lg tracking-widest ${
            label === 'Video A' 
              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          }`}>
            {label}
          </span>
          <span className="text-neutral-400 text-xs flex items-center gap-1.5">
            {isYoutube ? (
              <Youtube className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
            )}
            {isYoutube ? 'YouTube' : 'Instagram Reel'}
          </span>
        </div>
        
        {/* Engagement Rate Badge */}
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Engagement Rate</span>
          <span className="text-lg font-black bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
            {video.engagement_rate}%
          </span>
        </div>
      </div>

      {/* Video Details Row */}
      <div className="flex gap-4">
        {/* Thumbnail or Platform Mock Icon */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-neutral-900 rounded-xl overflow-hidden border border-white/5 flex-shrink-0 relative">
          {video.thumbnail ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={video.thumbnail} 
              alt={video.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-950">
              {isYoutube ? (
                <Youtube className="w-8 h-8 text-neutral-700" />
              ) : (
                <Instagram className="w-8 h-8 text-neutral-700" />
              )}
            </div>
          )}
          
          <div className="absolute bottom-1 right-1 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white/90 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {video.duration}s
          </div>
        </div>

        {/* Text Details */}
        <div className="flex flex-col justify-between py-1">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-neutral-100 line-clamp-2 leading-snug group-hover:text-white transition-colors duration-200">
              {video.title}
            </h3>
            <p className="text-xs text-neutral-400 mt-1.5 font-medium">
              @{video.creator}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {video.upload_date}
            </span>
          </div>
        </div>
      </div>

      {/* Core Engagement Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-neutral-500" /> Views
          </span>
          <span className="text-sm font-black text-neutral-200">{formatNumber(video.views)}</span>
        </div>
        
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-neutral-500" /> Likes
          </span>
          <span className="text-sm font-black text-neutral-200">{formatNumber(video.likes)}</span>
        </div>
        
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-neutral-500" /> Comments
          </span>
          <span className="text-sm font-black text-neutral-200">{formatNumber(video.comments)}</span>
        </div>
        
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-neutral-500" /> Followers
          </span>
          <span className="text-sm font-black text-neutral-200">{formatNumber(video.follower_count)}</span>
        </div>
      </div>

      {/* Hashtags Row */}
      {video.hashtags && video.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/5 pt-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Hash className="w-3 h-3" /> Tags:
          </span>
          {video.hashtags.slice(0, 5).map((tag, idx) => (
            <span 
              key={idx} 
              className="text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5 hover:border-white/10 px-2 py-0.5 rounded-md transition duration-200 cursor-pointer"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Transcript Preview Toggle */}
      <div className="border-t border-white/5 pt-4">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition duration-200 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Show Video Transcript Loaded in Vector DB
          </span>
          {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTranscript && (
          <div className="mt-3 bg-neutral-950/70 border border-white/5 rounded-xl p-3.5 h-44 overflow-y-auto font-mono text-[11px] text-neutral-400 leading-relaxed scrollbar-thin">
            {video.transcript ? (
              video.transcript.split('\n').map((line, idx) => (
                <div key={idx} className="hover:text-neutral-200 transition duration-100">
                  {line}
                </div>
              ))
            ) : (
              <span className="text-neutral-600 italic">No transcript chunks successfully loaded.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

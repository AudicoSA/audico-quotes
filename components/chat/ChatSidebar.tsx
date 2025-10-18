'use client';

import { ChatType } from '@/app/chat/page';
import {
  Home,
  Building2,
  UtensilsCrossed,
  Dumbbell,
  Church,
  GraduationCap,
  Music,
  FileText,
} from 'lucide-react';

interface ChatSidebarProps {
  selectedChat: ChatType;
  onSelectChat: (chat: ChatType) => void;
}

const chatOptions: { id: ChatType; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { id: 'business', label: 'Business', icon: <Building2 className="w-5 h-5" /> },
  { id: 'restaurant', label: 'Restaurant', icon: <UtensilsCrossed className="w-5 h-5" /> },
  { id: 'gym', label: 'Gym', icon: <Dumbbell className="w-5 h-5" /> },
  { id: 'worship', label: 'Worship', icon: <Church className="w-5 h-5" /> },
  { id: 'education', label: 'Education', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'club', label: 'Club', icon: <Music className="w-5 h-5" /> },
  { id: 'tender', label: 'Tender', icon: <FileText className="w-5 h-5" /> },
];

export default function ChatSidebar({ selectedChat, onSelectChat }: ChatSidebarProps) {
  return (
    <div className="w-20 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center py-6 space-y-2 shadow-2xl">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">A</span>
        </div>
      </div>

      {/* Chat Type Options */}
      {chatOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => onSelectChat(option.id)}
          className={`
            w-14 h-14 rounded-2xl flex flex-col items-center justify-center
            transition-all duration-200 group relative
            ${
              selectedChat === option.id
                ? 'bg-white text-purple-600 shadow-lg scale-110'
                : 'bg-slate-700/50 text-gray-400 hover:bg-slate-600/80 hover:text-white hover:scale-105'
            }
          `}
        >
          {option.icon}

          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {option.label}
          </div>
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Profile Icon */}
      <button className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
        <span className="text-white font-semibold text-sm">KC</span>
      </button>
    </div>
  );
}

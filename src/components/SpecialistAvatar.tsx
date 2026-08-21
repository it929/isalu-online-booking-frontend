import React from "react";
import { Stethoscope } from "lucide-react";

interface SpecialistAvatarProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  imageUrl?: string;
}

export function SpecialistAvatar({ name, className = "", size = "md", imageUrl }: SpecialistAvatarProps) {
  const sizeClasses = {
    sm: "h-11 w-11",
    md: "h-16 w-16",
    lg: "h-20 w-20",
  };

  const badgeSizeClasses = {
    sm: "h-4 w-4 p-0.5",
    md: "h-5 w-5 p-1",
    lg: "h-6 w-6 p-1",
  };

  const isSpecialistB = name.toLowerCase().includes("b");

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}>
      {imageUrl && !imageUrl.includes("ui-avatars.com") ? (
        <img
          src={imageUrl}
          alt={name}
          className={`${sizeClasses[size]} rounded-2xl object-cover border-2 border-sky-400/30 shadow-md`}
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${
            isSpecialistB
              ? "from-sky-400 via-[#008ac9] to-[#005596]"
              : "from-[#008ac9] via-[#006bb3] to-slate-800"
          } text-white font-black flex items-center justify-center shadow-md border-2 border-white/30 overflow-hidden relative`}
        >
          {/* Doctor Vector Avatar Graphic (NO duplicate text!) */}
          <svg
            className="w-4/5 h-4/5 text-white transform translate-y-1.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Head */}
            <circle cx="12" cy="7" r="4" fill="currentColor" fillOpacity="0.25" />
            {/* Shoulders & White Coat */}
            <path d="M5.5 21v-2a4.5 4.5 0 0 1 4.5-4.5h4a4.5 4.5 0 0 1 4.5 4.5v2" />
            {/* Stethoscope */}
            <path d="M9 13.5v1.5a3 3 0 0 0 6 0v-1.5" strokeWidth="1.4" />
          </svg>
        </div>
      )}

      <div className={`absolute -bottom-1 -right-1 rounded-full bg-[#008ac9] text-white shadow ${badgeSizeClasses[size]} flex items-center justify-center border-2 border-white dark:border-slate-900`}>
        <Stethoscope className="w-full h-full text-white" />
      </div>
    </div>
  );
}

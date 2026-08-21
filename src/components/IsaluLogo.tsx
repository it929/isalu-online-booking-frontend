import React from "react";

interface IsaluLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function IsaluLogo({ className = "", iconOnly = false, size = "md" }: IsaluLogoProps) {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-11 w-11",
    lg: "h-14 w-14",
  };

  const rcTextSizes = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-[12px]",
  };

  const isaluTextSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  const hospitalsTextSizes = {
    sm: "text-[9px]",
    md: "text-[12px]",
    lg: "text-[15px]",
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official 4-Sphere Diamond Emblem */}
      <div className={`relative flex items-center justify-center flex-shrink-0 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            {/* Glossy 3D Sphere Radial Gradient */}
            <radialGradient
              id="isaluSphereGrad"
              cx="38%"
              cy="32%"
              r="60%"
              fx="38%"
              fy="32%"
            >
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#38bdf8" />
              <stop offset="65%" stopColor="#0090d9" />
              <stop offset="100%" stopColor="#0066b3" />
            </radialGradient>

            {/* Soft Shadow filter for 3D depth */}
            <filter id="sphereShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#004d80" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* 4 Spheres in Diamond Cross Configuration */}
          {/* Top Sphere */}
          <circle cx="50" cy="22" r="19" fill="url(#isaluSphereGrad)" filter="url(#sphereShadow)" />
          
          {/* Left Sphere */}
          <circle cx="22" cy="50" r="19" fill="url(#isaluSphereGrad)" filter="url(#sphereShadow)" />
          
          {/* Right Sphere */}
          <circle cx="78" cy="50" r="19" fill="url(#isaluSphereGrad)" filter="url(#sphereShadow)" />
          
          {/* Bottom Sphere */}
          <circle cx="50" cy="78" r="19" fill="url(#isaluSphereGrad)" filter="url(#sphereShadow)" />
        </svg>
      </div>

      {/* Official Typography: RC 502112 + ISALU + HOSPITALS */}
      {!iconOnly && (
        <div className="flex flex-col leading-none font-sans justify-center">
          <span className={`font-bold tracking-wider text-[#008ac9] dark:text-[#38bdf8] mb-0.5 ${rcTextSizes[size]}`}>
            RC 502112
          </span>
          <span className={`font-black tracking-tight text-[#008ac9] dark:text-[#38bdf8] uppercase ${isaluTextSizes[size]}`}>
            ISALU
          </span>
          <span className={`font-extrabold tracking-widest text-[#008ac9] dark:text-[#38bdf8] uppercase mt-0.5 ${hospitalsTextSizes[size]}`}>
            HOSPITALS
          </span>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp, ArrowDown, Play, Pause, ChevronsUp, ChevronsDown } from "lucide-react";

export function AutoScrollWidget() {
  const { pathname } = useLocation();
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const scrollDirectionRef = useRef<"down" | "up">("down");
  const animationFrameRef = useRef<number | null>(null);

  // Auto Scroll To Top on Route Change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsAutoScrolling(false);
  }, [pathname]);

  // Monitor scroll position for showing scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth Auto Scroll Down and Up Loop
  useEffect(() => {
    if (!isAutoScrolling) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const scrollStep = () => {
      const currentScroll = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollDirectionRef.current === "down") {
        if (currentScroll >= maxScroll - 5) {
          scrollDirectionRef.current = "up";
        } else {
          window.scrollBy(0, 1.8);
        }
      } else {
        if (currentScroll <= 5) {
          scrollDirectionRef.current = "down";
        } else {
          window.scrollBy(0, -2.5);
        }
      }

      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    animationFrameRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAutoScrolling]);

  const scrollToTop = () => {
    setIsAutoScrolling(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    setIsAutoScrolling(false);
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  const toggleAutoScroll = () => {
    setIsAutoScrolling((prev) => !prev);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none">
      {/* Auto Scroll Status Toast */}
      {isAutoScrolling && (
        <div className="bg-[#008ac9] text-white text-xs font-black px-4 py-2 rounded-2xl shadow-xl border-2 border-white flex items-center gap-2 animate-bounce">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          Auto Scrolling {scrollDirectionRef.current === "down" ? "Down ↓" : "Up ↑"}
        </div>
      )}

      <div className="flex flex-col gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl">
        {/* Scroll To Top Button */}
        {showTopBtn && (
          <button
            onClick={scrollToTop}
            title="Scroll to Top"
            className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-[#008ac9] hover:text-white text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center transition-all duration-200 shadow-md group"
          >
            <ArrowUp className="h-5 w-5 transform group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}

        {/* Auto Scroll Toggle Button (Down/Up) */}
        <button
          onClick={toggleAutoScroll}
          title={isAutoScrolling ? "Pause Auto Scroll" : "Start Auto Scroll Down & Up"}
          className={`h-12 w-12 rounded-2xl font-black flex items-center justify-center transition-all duration-300 shadow-lg border-2 ${
            isAutoScrolling
              ? "bg-amber-500 text-white border-amber-400 ring-4 ring-amber-500/30 scale-105"
              : "bg-[#008ac9] hover:bg-[#0072b1] text-white border-[#008ac9] hover:scale-105"
          }`}
        >
          {isAutoScrolling ? (
            <Pause className="h-6 w-6" />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <ChevronsDown className="h-5 w-5" />
            </div>
          )}
        </button>

        {/* Scroll To Bottom Button */}
        <button
          onClick={scrollToBottom}
          title="Scroll to Bottom"
          className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-[#008ac9] hover:text-white text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center transition-all duration-200 shadow-md group"
        >
          <ArrowDown className="h-5 w-5 transform group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

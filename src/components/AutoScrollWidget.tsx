import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp, ArrowDown, Pause, ChevronsDown } from "lucide-react";

/**
 * Site-wide scroll helper: a small, low-key pill in the bottom-right corner
 * with "top", "auto scroll" and "bottom" buttons.
 * - The top/bottom buttons only appear when they would do something.
 * - Auto scroll glides down then back up, and stops as soon as the visitor
 *   scrolls, taps or presses a key themselves.
 */
export function AutoScrollWidget() {
  const { pathname } = useLocation();
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showBottomBtn, setShowBottomBtn] = useState(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const scrollDirectionRef = useRef<"down" | "up">("down");
  const animationFrameRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Back to the top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsAutoScrolling(false);
  }, [pathname]);

  // Show each jump button only when it is useful
  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setShowTopBtn(window.scrollY > 200);
      setShowBottomBtn(maxScroll > 200 && window.scrollY < maxScroll - 200);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [pathname]);

  // Smooth auto scroll (down, then back up), speed independent of refresh rate
  useEffect(() => {
    if (!isAutoScrolling) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    let last = performance.now();
    const scrollStep = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const currentScroll = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollDirectionRef.current === "down") {
        if (currentScroll >= maxScroll - 5) {
          scrollDirectionRef.current = "up";
          setDirection("up");
        } else {
          window.scrollBy(0, 0.11 * dt);
        }
      } else if (currentScroll <= 5) {
        scrollDirectionRef.current = "down";
        setDirection("down");
      } else {
        window.scrollBy(0, -0.16 * dt);
      }

      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    animationFrameRef.current = requestAnimationFrame(scrollStep);

    // Any manual input hands control back to the visitor
    // (input on the widget itself is ignored, so its Pause button still works)
    const stop = (e: Event) => {
      if (rootRef.current && e.target instanceof Node && rootRef.current.contains(e.target)) return;
      setIsAutoScrolling(false);
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [isAutoScrolling]);

  const scrollToTop = () => {
    setIsAutoScrolling(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    setIsAutoScrolling(false);
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  const toggleAutoScroll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoScrolling((prev) => !prev);
  };

  const ghostBtn =
    "h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 " +
    "hover:bg-[#008ac9]/10 hover:text-[#008ac9] dark:hover:text-sky-300 transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ac9]/50";

  return (
    <div
      ref={rootRef}
      className="isalu-scrollwidget fixed bottom-4 right-3 sm:bottom-6 sm:right-5 z-50 flex flex-col items-end gap-2 select-none print:hidden"
      data-testid="autoscroll-widget"
    >
      {isAutoScrolling && (
        <div
          role="status"
          className="bg-slate-900/85 dark:bg-slate-800/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur flex items-center gap-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Scrolling {direction === "down" ? "down" : "up"} · tap to stop
        </div>
      )}

      <div className="flex flex-col items-center gap-0.5 p-1 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-[0_8px_24px_-10px_rgba(15,40,80,0.35)] opacity-80 hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {showTopBtn && (
          <button type="button" onClick={scrollToTop} title="Back to top" aria-label="Back to top" className={ghostBtn}>
            <ArrowUp className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleAutoScroll}
          title={isAutoScrolling ? "Pause auto scroll" : "Auto scroll the page"}
          aria-label={isAutoScrolling ? "Pause auto scroll" : "Auto scroll the page"}
          aria-pressed={isAutoScrolling}
          className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ac9]/50 ${isAutoScrolling ? "bg-amber-500 hover:bg-amber-600" : "bg-[#008ac9] hover:bg-[#0072b1]"
            }`}
        >
          {isAutoScrolling ? <Pause className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}
        </button>

        {showBottomBtn && (
          <button type="button" onClick={scrollToBottom} title="Go to bottom" aria-label="Go to bottom" className={ghostBtn}>
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

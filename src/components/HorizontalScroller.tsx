"use client";

import { Children, useEffect, useMemo, useRef } from "react";
import { Box, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { ReactNode } from "react";

interface HorizontalScrollerProps {
  children: ReactNode;
  infinite?: boolean;
}

export default function HorizontalScroller({
  children,
  infinite = true,
}: HorizontalScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const childArray = useMemo(() => Children.toArray(children), [children]);

  function scrollByAmount(direction: "left" | "right") {
    if (!ref.current) return;

    const container = ref.current;
    const amount = Math.max(container.clientWidth * 0.8, 220);
    const delta = direction === "left" ? -amount : amount;

    container.scrollBy({
      left: delta,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;

    if (!infinite) {
      function handleWheel(e: WheelEvent) {
        const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        if (!horizontalIntent) return;

        e.preventDefault();
        container.scrollLeft += e.deltaX;
      }

      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }

    let isAdjusting = false;

    function setInitialPosition() {
      const segmentWidth = container.scrollWidth / 3;
      if (segmentWidth > 0) {
        container.scrollLeft = segmentWidth;
      }
    }

    function normalizeScroll() {
      if (isAdjusting) return;

      const segmentWidth = container.scrollWidth / 3;
      if (segmentWidth <= 0) return;

      if (container.scrollLeft < segmentWidth * 0.5) {
        isAdjusting = true;
        container.scrollLeft += segmentWidth;
        isAdjusting = false;
      } else if (container.scrollLeft > segmentWidth * 1.5) {
        isAdjusting = true;
        container.scrollLeft -= segmentWidth;
        isAdjusting = false;
      }
    }

    function handleWheel(e: WheelEvent) {
      const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontalIntent) return;

      e.preventDefault();
      container.scrollLeft += e.deltaX;
      normalizeScroll();
    }

    function handleScroll() {
      normalizeScroll();
    }

    setInitialPosition();
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", setInitialPosition);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", setInitialPosition);
    };
  }, [childArray.length, infinite]);

  return (
    <Box sx={{ position: "relative" }}>
      <IconButton
        aria-label="Scroll left"
        onClick={() => scrollByAmount("left")}
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 8,
          zIndex: 2,
          width: { xs: 32, sm: 40 },
          borderRadius: 0,
          bgcolor: "rgba(0,0,0,0.72)",
          color: "primary.main",
          border: "1px solid rgba(255,255,255,0.12)",
          "&:hover": {
            bgcolor: "rgba(0,0,0,0.88)",
          },
        }}
      >
        <ChevronLeftIcon />
      </IconButton>

      <Box
        ref={ref}
        sx={{
          display: "flex",
          gap: 1.5,
          overflowX: "auto",
          pb: 1,
          px: { xs: 4.5, sm: 5.5 },
          cursor: "grab",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {infinite
          ? [0, 1, 2].map((copyIndex) => (
              <Box
                key={copyIndex}
                sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}
              >
                {childArray.map((child, childIndex) => (
                  <Box
                    key={`${copyIndex}-${childIndex}`}
                    sx={{ display: "flex", flexShrink: 0 }}
                  >
                    {child}
                  </Box>
                ))}
              </Box>
            ))
          : childArray}
      </Box>

      <IconButton
        aria-label="Scroll right"
        onClick={() => scrollByAmount("right")}
        sx={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 8,
          zIndex: 2,
          width: { xs: 32, sm: 40 },
          borderRadius: 0,
          bgcolor: "rgba(0,0,0,0.72)",
          color: "primary.main",
          border: "1px solid rgba(255,255,255,0.12)",
          "&:hover": {
            bgcolor: "rgba(0,0,0,0.88)",
          },
        }}
      >
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Box, Typography } from "@mui/material";
import { MovieCard, TVShowCard } from "@/types/backendObjects";
import MediaPreviewModal from "@/components/MediaPreviewModal";

interface MediaCarouselProps {
  items: (MovieCard | TVShowCard)[];
  mediaType: "movie" | "tv";
  infinite?: boolean;
}

export default function MediaCarousel({
  items,
  mediaType,
  infinite = true,
}: MediaCarouselProps) {
  // offset is now a ref to prevent 60fps React re-renders
  const offsetRef = useRef(0);
  
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(
    items[0]?.id ?? null,
  );
  const isPreviewOpen = selectedId !== null;

  const carouselRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, width: 0 });
  const requestRef = useRef<number>(null);
  const snapPendingRef = useRef(false);
  const wasEdgeScrollingRef = useRef(false);
  const wheelStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWheelScrollingRef = useRef(false);
  const hoverCenterIndexRef = useRef<number | null>(null);
  const pointerClientPosRef = useRef({ x: 0, y: 0 });
  const hoverLockPointerRef = useRef<{ x: number; y: number } | null>(null);
  const touchDragStartXRef = useRef<number | null>(null);
  const touchDragLastXRef = useRef<number | null>(null);
  const touchDraggingRef = useRef(false);
  const preventClickRef = useRef(false);
  const centerCandidateIndexRef = useRef<number | null>(null);
  const centerHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemCount = items.length;
  const cardWidth = 180;
  const spacing = 220;
  const labelHeight = 56;
  const hoverEaseFactor = 0.1;
  const snapEaseFactor = 0.08;
  const wheelScrollFactor = 0.65;
  const touchScrollFactor = 0.65;
  const totalWidth = itemCount * spacing;
  const minOffset = -(Math.max(itemCount - 1, 0) * spacing);

  const normalizeOffset = useCallback(
    (value: number) => {
      if (!infinite || totalWidth <= 0) {
        return Math.min(0, Math.max(minOffset, value));
      }
      return value % totalWidth;
    },
    [infinite, minOffset, totalWidth],
  );

  useEffect(() => {
    const updateBounds = () => {
      if (!carouselRef.current) return;
      const { width } = carouselRef.current.getBoundingClientRect();
      mousePos.current = {
        width,
        x: width / 2,
      };
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, []);

  useEffect(() => {
    setHighlightedId(items[0]?.id ?? null);
    centerCandidateIndexRef.current = null;
  }, [items]);

  useEffect(() => {
    if (isPreviewOpen) return;

    isWheelScrollingRef.current = false;
    snapPendingRef.current = true;
    hoverCenterIndexRef.current = null;
    hoverLockPointerRef.current = null;
    touchDragStartXRef.current = null;
    touchDragLastXRef.current = null;
    touchDraggingRef.current = false;
    preventClickRef.current = false;

    if (wheelStopTimeoutRef.current) {
      clearTimeout(wheelStopTimeoutRef.current);
      wheelStopTimeoutRef.current = null;
    }
  }, [isPreviewOpen]);

  useEffect(() => {
    const animate = () => {
      const { width } = mousePos.current;
      if (!width) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const isEdgeScrolling = false;

      if (isEdgeScrolling) {
        snapPendingRef.current = false;
        hoverCenterIndexRef.current = null;
      } else if (wasEdgeScrollingRef.current) {
        snapPendingRef.current = true;
      }

      // Physics logic updated to mutate offsetRef directly
      if (
        !isPreviewOpen &&
        !isEdgeScrolling &&
        !isWheelScrollingRef.current &&
        hoverCenterIndexRef.current != null &&
        totalWidth > 0
      ) {
        const baseTarget = -hoverCenterIndexRef.current! * spacing;
        const target = infinite
          ? [
              baseTarget - totalWidth,
              baseTarget,
              baseTarget + totalWidth,
            ].reduce((closest, candidate) =>
              Math.abs(candidate - offsetRef.current) < Math.abs(closest - offsetRef.current)
                ? candidate
                : closest,
            )
          : normalizeOffset(baseTarget);
          
        const delta = target - offsetRef.current;

        if (Math.abs(delta) < 0.5) {
          offsetRef.current = target;
        } else {
          offsetRef.current += delta * hoverEaseFactor;
        }
      } else if (
        !isPreviewOpen &&
        !isEdgeScrolling &&
        snapPendingRef.current &&
        totalWidth > 0
      ) {
        const nearestIndex = Math.round(offsetRef.current / spacing);
        const snapped = nearestIndex * spacing;
        const delta = snapped - offsetRef.current;

        if (Math.abs(delta) < 0.5) {
          snapPendingRef.current = false;
          offsetRef.current = snapped;
        } else {
          offsetRef.current += delta * snapEaseFactor;
        }
      }

      wasEdgeScrollingRef.current = isEdgeScrolling;

      // O(1) Math to find center item instead of items.reduce
      if (!isPreviewOpen && itemCount > 0) {
        const currentOffset = offsetRef.current;
        let nearestIndex = Math.round(Math.abs(currentOffset) / spacing);
        
        if (infinite && totalWidth > 0) {
           // Handle negative offset wrapping
           nearestIndex = currentOffset <= 0 
             ? Math.round(Math.abs(currentOffset) / spacing) % itemCount
             : (itemCount - (Math.round(currentOffset / spacing) % itemCount)) % itemCount;
        } else if (!infinite) {
           nearestIndex = Math.round(Math.abs(currentOffset) / spacing);
           nearestIndex = Math.max(0, Math.min(nearestIndex, itemCount - 1));
        }

        if (nearestIndex !== centerCandidateIndexRef.current) {
          centerCandidateIndexRef.current = nearestIndex;

          if (centerHighlightTimeoutRef.current) {
            clearTimeout(centerHighlightTimeoutRef.current);
          }

          centerHighlightTimeoutRef.current = setTimeout(() => {
            const centeredItem = items[nearestIndex];
            if (centeredItem) {
              setHighlightedId(centeredItem.id);
            }
          }, 50);
        }
      }

      // Direct DOM Mutation for 60fps rendering without React state updates
      if (carouselRef.current) {
        const itemNodes = carouselRef.current.querySelectorAll('.carousel-item');
        itemNodes.forEach((node, index) => {
          const el = node as HTMLElement;
          let x = index * spacing + offsetRef.current;

          if (infinite && totalWidth > 0) {
            x = x % totalWidth;
            if (x > totalWidth / 2) x -= totalWidth;
            if (x < -totalWidth / 2) x += totalWidth;
          }

          const distanceFromCenter = Math.abs(x);
          const scale = Math.max(0.8, 1.1 - distanceFromCenter / 1000);
          const centerProximity = Math.max(0, 1 - distanceFromCenter / 900);
          const imageBrightness = 0.62 + centerProximity * 0.55;

          el.style.transform = `translate3d(${x}px, 0, 0) scale(${scale})`;
          el.style.zIndex = Math.round(100 - distanceFromCenter / 10).toString();

          const poster = el.querySelector('.poster-image') as HTMLElement;
          if (poster) {
             poster.style.filter = `brightness(${imageBrightness})`;
          }
        });
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (wheelStopTimeoutRef.current) clearTimeout(wheelStopTimeoutRef.current);
      if (centerHighlightTimeoutRef.current) clearTimeout(centerHighlightTimeoutRef.current);
    };
  }, [
    infinite,
    isPreviewOpen,
    itemCount,
    items,
    normalizeOffset,
    hoverEaseFactor,
    snapEaseFactor,
    spacing,
    totalWidth,
  ]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPreviewOpen) return;
    pointerClientPosRef.current = { x: e.clientX, y: e.clientY };

    if (carouselRef.current) {
      const rect = carouselRef.current.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        width: rect.width,
      };
    }
  };

  const handleMouseLeave = () => {
    if (isPreviewOpen) return;
    if (carouselRef.current) {
      const { width } = carouselRef.current.getBoundingClientRect();
      mousePos.current = { width, x: width / 2 };
      snapPendingRef.current = true;
      hoverCenterIndexRef.current = null;
      hoverLockPointerRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isPreviewOpen) return;
    const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (!horizontalIntent) return;

    e.preventDefault();
    snapPendingRef.current = false;
    hoverCenterIndexRef.current = null;
    hoverLockPointerRef.current = null;
    isWheelScrollingRef.current = true;
    
    offsetRef.current = normalizeOffset(offsetRef.current - e.deltaX * wheelScrollFactor);

    if (wheelStopTimeoutRef.current) clearTimeout(wheelStopTimeoutRef.current);
    wheelStopTimeoutRef.current = setTimeout(() => {
      isWheelScrollingRef.current = false;
      snapPendingRef.current = true;
    }, 80);
  };

  const handleItemClick = (id: number) => {
    if (preventClickRef.current) {
      preventClickRef.current = false;
      return;
    }
    setSelectedId(id);
  };

  const handleClose = () => {
    setSelectedId(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPreviewOpen) return;
    const touch = e.touches[0];
    touchDragStartXRef.current = touch.clientX;
    touchDragLastXRef.current = touch.clientX;
    touchDraggingRef.current = false;
    preventClickRef.current = false;
    snapPendingRef.current = false;
    hoverCenterIndexRef.current = null;
    hoverLockPointerRef.current = null;
    isWheelScrollingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPreviewOpen) return;
    const touch = e.touches[0];
    const lastX = touchDragLastXRef.current;
    const startX = touchDragStartXRef.current;

    if (lastX == null || startX == null) return;

    const deltaX = touch.clientX - lastX;
    const totalDelta = touch.clientX - startX;

    if (Math.abs(totalDelta) > 6) {
      touchDraggingRef.current = true;
      preventClickRef.current = true;
    }

    if (touchDraggingRef.current) {
      e.preventDefault();
      offsetRef.current = normalizeOffset(offsetRef.current + deltaX * touchScrollFactor);
    }

    touchDragLastXRef.current = touch.clientX;
  };

  const handleTouchEnd = () => {
    if (isPreviewOpen) return;
    touchDragStartXRef.current = null;
    touchDragLastXRef.current = null;
    isWheelScrollingRef.current = false;
    snapPendingRef.current = true;

    window.setTimeout(() => {
      touchDraggingRef.current = false;
      preventClickRef.current = false;
    }, 0);
  };

  return (
    <Box
      ref={carouselRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{
        width: "100%",
        height: { xs: "360px", sm: "400px", md: "460px" },
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        cursor: "crosshair",
        position: "relative",
        touchAction: isPreviewOpen ? "none" : "pan-y",
        pointerEvents: isPreviewOpen ? "none" : "auto",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: { xs: "280px", sm: "300px", md: "336px" },
          position: "relative",
        }}
      >
        {items.map((item, index) => {
          return (
            <Box
              key={item.id}
              className="carousel-item"
              onClick={() => handleItemClick(item.id)}
              onMouseEnter={() => {
                if (!isWheelScrollingRef.current && !wasEdgeScrollingRef.current) {
                  const pointer = pointerClientPosRef.current;
                  const lock = hoverLockPointerRef.current;
                  const pointerMovedEnough =
                    !lock ||
                    Math.abs(pointer.x - lock.x) > 24 ||
                    Math.abs(pointer.y - lock.y) > 24;

                  if (!pointerMovedEnough) return;

                  snapPendingRef.current = false;
                  hoverCenterIndexRef.current = index;
                  hoverLockPointerRef.current = pointer;
                }
              }}
              sx={{
                position: "absolute",
                width: `${cardWidth}px`,
                height: `${280 + labelHeight}px`,
                left: "50%",
                top: "50%",
                marginLeft: `-${cardWidth / 2}px`,
                marginTop: `-${(280 + labelHeight) / 2}px`,
                borderRadius: "8px",
                overflow: "hidden",
                border:
                  highlightedId === item.id
                    ? "3px solid #F5C518"
                    : "3px solid transparent",
                boxShadow:
                  highlightedId === item.id
                    ? "0 0 0 1px rgba(245,197,24,0.55), 0 0 24px rgba(245,197,24,0.45), 0 10px 30px rgba(0,0,0,0.5)"
                    : "0 10px 30px rgba(0,0,0,0.5)",
                cursor: "pointer",
                willChange: "transform",
                transition: "border-color 0.2s ease, box-shadow 0.3s ease",
                "&:hover": {
                  boxShadow: "0 0 20px #F5C518",
                  zIndex: "1000 !important",
                  "& .poster-image": {
                    transform: "scale(1.05)",
                  },
                },
              }}
            >
              <Box
                className="poster-image"
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "280px",
                  transformOrigin: "center",
                  transition: "transform 0.25s ease",
                }}
              >
                <Image
                  src={
                    item.posterUrl ||
                    (mediaType === "movie"
                      ? "/movie-placeholder.svg"
                      : "/tv-placeholder.svg")
                  }
                  alt={item.title}
                  fill
                  sizes="180px"
                  style={{
                    objectFit: "cover",
                  }}
                />
              </Box>
              <Box
                className="media-info"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: `${labelHeight}px`,
                  background: "transparent",
                  color: "#F5C518",
                  px: 1.5,
                  py: 1,
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.title}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <MediaPreviewModal
        mediaId={selectedId}
        mediaType={mediaType}
        onClose={handleClose}
      />
    </Box>
  );
}
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Box,
  Typography,
  Modal,
  Backdrop,
  Fade,
  IconButton,
  Stack,
  Chip,
  Divider,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  MovieCard,
  MovieDetail,
  TVShowCard,
  TVShowDetail,
} from "@/types/backendObjects";
import { getMovieById, getTVShowById } from "@/lib/fetchAPI";

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
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MovieDetail | TVShowDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, width: 0 });
  const requestRef = useRef<number>(null);
  const snapPendingRef = useRef(false);
  const wasEdgeScrollingRef = useRef(false);
  const wheelStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isWheelScrollingRef = useRef(false);
  const hoverCenterIndexRef = useRef<number | null>(null);
  const pointerClientPosRef = useRef({ x: 0, y: 0 });
  const hoverLockPointerRef = useRef<{ x: number; y: number } | null>(null);

  const itemCount = items.length;
  const cardWidth = 180;
  const spacing = 220;
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

      if (
        !isEdgeScrolling &&
        !isWheelScrollingRef.current &&
        hoverCenterIndexRef.current != null &&
        totalWidth > 0
      ) {
        setOffset((prev) => {
          const baseTarget = -hoverCenterIndexRef.current! * spacing;
          const target = infinite
            ? [
                baseTarget - totalWidth,
                baseTarget,
                baseTarget + totalWidth,
              ].reduce((closest, candidate) =>
                Math.abs(candidate - prev) < Math.abs(closest - prev)
                  ? candidate
                  : closest,
              )
            : normalizeOffset(baseTarget);
          const delta = target - prev;

          if (Math.abs(delta) < 0.5) {
            return target;
          }

          return prev + delta * 0.18;
        });
      } else if (!isEdgeScrolling && snapPendingRef.current && totalWidth > 0) {
        setOffset((prev) => {
          const nearestIndex = Math.round(prev / spacing);
          const snapped = nearestIndex * spacing;
          const delta = snapped - prev;

          if (Math.abs(delta) < 0.5) {
            snapPendingRef.current = false;
            return snapped;
          }

          return prev + delta * 0.14;
        });
      }

      wasEdgeScrollingRef.current = isEdgeScrolling;

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (wheelStopTimeoutRef.current)
        clearTimeout(wheelStopTimeoutRef.current);
    };
  }, [infinite, normalizeOffset, spacing, totalWidth]);

  const handleMouseMove = (e: React.MouseEvent) => {
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
    if (carouselRef.current) {
      const { width } = carouselRef.current.getBoundingClientRect();
      mousePos.current = {
        width,
        x: width / 2,
      };
      snapPendingRef.current = true;
      hoverCenterIndexRef.current = null;
      hoverLockPointerRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (!horizontalIntent) return;

    e.preventDefault();
    snapPendingRef.current = false;
    hoverCenterIndexRef.current = null;
    hoverLockPointerRef.current = null;
    isWheelScrollingRef.current = true;
    setOffset((prev) => normalizeOffset(prev - e.deltaX));

    if (wheelStopTimeoutRef.current) clearTimeout(wheelStopTimeoutRef.current);
    wheelStopTimeoutRef.current = setTimeout(() => {
      isWheelScrollingRef.current = false;
      snapPendingRef.current = true;
    }, 80);
  };

  const handleItemClick = async (id: number) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const result =
        mediaType === "movie"
          ? await getMovieById(id)
          : await getTVShowById(id);
      setDetail(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleClose = () => {
    setSelectedId(null);
    setDetail(null);
  };

  return (
    <Box
      ref={carouselRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      sx={{
        width: "100%",
        height: "420px", // Reduced height
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        cursor: "crosshair",
        position: "relative",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "280px", // Adjusted height
          position: "relative",
        }}
      >
        {items.map((item, index) => {
          // Calculate horizontal position with wrapping
          let x = index * spacing + offset;

          if (infinite && totalWidth > 0) {
            x = x % totalWidth;

            // Center the wrapping window around 0
            if (x > totalWidth / 2) x -= totalWidth;
            if (x < -totalWidth / 2) x += totalWidth;
          }

          // Subtle scale effect for cards near the center
          const distanceFromCenter = Math.abs(x);
          const scale = Math.max(0.8, 1.1 - distanceFromCenter / 1000);
          const centerProximity = Math.max(0, 1 - distanceFromCenter / 900);
          const imageBrightness = 0.62 + centerProximity * 0.55;
          const overlayOpacity = 0.68 - centerProximity * 0.4;

          return (
            <Box
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              onMouseEnter={() => {
                if (
                  !isWheelScrollingRef.current &&
                  !wasEdgeScrollingRef.current
                ) {
                  const pointer = pointerClientPosRef.current;
                  const lock = hoverLockPointerRef.current;
                  const pointerMovedEnough =
                    !lock ||
                    Math.abs(pointer.x - lock.x) > 24 ||
                    Math.abs(pointer.y - lock.y) > 24;

                  if (!pointerMovedEnough) {
                    return;
                  }

                  snapPendingRef.current = false;
                  hoverCenterIndexRef.current = index;
                  hoverLockPointerRef.current = pointer;
                }
              }}
              sx={{
                position: "absolute",
                width: `${cardWidth}px`,
                height: "280px", // Adjusted height
                left: "50%",
                top: "50%",
                marginLeft: `-${cardWidth / 2}px`,
                marginTop: "-140px", // Adjusted offset
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                cursor: "pointer",
                transform: `translate3d(${x}px, 0, 0) scale(${scale})`,
                zIndex: Math.round(100 - distanceFromCenter / 10),
                willChange: "transform",
                transition: "box-shadow 0.3s ease",
                "&:hover": {
                  boxShadow: "0 0 20px #F5C518", // Yellow glow on hover
                  zIndex: 1000,
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
                  height: "100%",
                  transformOrigin: "center",
                  transition: "transform 0.25s ease",
                }}
              >
                <Image
                  src={
                    item.posterUrl ||
                    "https://via.placeholder.com/200x300?text=No+Poster"
                  }
                  alt={item.title}
                  fill
                  sizes="180px"
                  style={{
                    objectFit: "cover",
                    filter: `brightness(${imageBrightness})`,
                  }}
                />
              </Box>
              <Box
                className="media-info"
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `rgba(0,0,0,${overlayOpacity})`,
                  color: "#F5C518", // Yellow text
                  p: 2,
                  textAlign: "center",
                  transition: "background-color 0.3s",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  {item.title}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Media Details Modal */}
      <Modal
        open={selectedId !== null}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={selectedId !== null}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: { xs: "90%", sm: "80%", md: "700px" },
              maxHeight: "90vh",
              bgcolor: "background.paper",
              boxShadow: 24,
              borderRadius: 2,
              outline: "none",
              overflowY: "auto",
              p: 0,
            }}
          >
            {loadingDetail ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography>Loading details...</Typography>
              </Box>
            ) : (
              detail && (
                <Box>
                  <Box sx={{ position: "relative", height: "300px" }}>
                    <IconButton
                      onClick={handleClose}
                      sx={{
                        position: "absolute",
                        right: 8,
                        top: 8,
                        zIndex: 1,
                        color: "white",
                        bgcolor: "rgba(0,0,0,0.5)",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                    <Box
                      component="img"
                      src={detail.backdropUrl || detail.posterUrl || ""}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: "100%",
                        p: 3,
                        background:
                          "linear-gradient(transparent, rgba(0,0,0,0.9))",
                        color: "white",
                      }}
                    >
                      <Typography variant="h4" component="h2">
                        {detail.title}
                      </Typography>
                      <Typography variant="subtitle1">
                        {mediaType === "movie"
                          ? (detail as MovieDetail).releaseYear
                          : new Date(
                              (detail as TVShowDetail).firstAirDate,
                            ).getFullYear()}
                        {mediaType === "movie" &&
                          ` • ${(detail as MovieDetail).runtimeMinutes} min`}
                        {mediaType === "tv" &&
                          ` • ${(detail as TVShowDetail).totalSeasons} Seasons`}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      {detail.genres.map((g) => (
                        <Chip key={g.id} label={g.name} size="small" />
                      ))}
                      <Chip
                        label={`Rating: ${detail.rating}/10`}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

                    <Typography variant="h6" gutterBottom>
                      Overview
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      paragraph
                    >
                      {detail.overview}
                    </Typography>

                    {mediaType === "movie" &&
                      (detail as MovieDetail).tagline && (
                        <Typography
                          variant="body2"
                          sx={{ fontStyle: "italic", mb: 2 }}
                        >
                          &ldquo;{(detail as MovieDetail).tagline}&rdquo;
                        </Typography>
                      )}

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>
                      Cast
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ overflowX: "auto", pb: 1 }}
                    >
                      {detail.cast.slice(0, 5).map((member, idx) => (
                        <Box
                          key={idx}
                          sx={{ minWidth: "100px", textAlign: "center" }}
                        >
                          <Box
                            component="img"
                            src={
                              member.profileUrl ||
                              "https://via.placeholder.com/100x150?text=No+Photo"
                            }
                            sx={{
                              width: "80px",
                              height: "120px",
                              objectFit: "cover",
                              borderRadius: 1,
                              mb: 1,
                            }}
                          />
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ fontWeight: "bold" }}
                          >
                            {member.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {member.character}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Button
                      component={Link}
                      href={`/media/${mediaType}/${detail.id}`}
                      variant="outlined"
                      color="primary"
                      onClick={handleClose}
                      sx={{ mt: 1 }}
                    >
                      View Full Details
                    </Button>
                  </Box>
                </Box>
              )
            )}
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
}

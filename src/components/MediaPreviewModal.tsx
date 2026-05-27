"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Backdrop,
  Box,
  Button,
  Chip,
  Divider,
  Fade,
  IconButton,
  Modal,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";

import { MovieDetail, TVShowDetail } from "@/types/backendObjects";
import { getMovieById, getTVShowById } from "@/lib/fetchAPI";
import { getTitleRatings } from "@/lib/media-api";

interface MediaPreviewModalProps {
  mediaId: number | null;
  mediaType: "movie" | "tv";
  onClose: () => void;
}

export default function MediaPreviewModal({
  mediaId,
  mediaType,
  onClose,
}: MediaPreviewModalProps) {
  const [detail, setDetail] = useState<MovieDetail | TVShowDetail | null>(null);
  const [communityRating, setCommunityRating] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const isOpen = mediaId !== null;

  useEffect(() => {
    if (mediaId == null) {
      setDetail(null);
      setCommunityRating(null);
      setLoadingDetail(false);
      return;
    }

    let cancelled = false;
    const resolvedMediaId = mediaId;

    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const [result, ratings] = await Promise.all([
          mediaType === "movie"
            ? getMovieById(resolvedMediaId)
            : getTVShowById(resolvedMediaId),
          getTitleRatings(resolvedMediaId, mediaType),
        ]);

        if (!cancelled) {
          setDetail(result);
          setCommunityRating(
            ratings.totalRatings > 0 ? ratings.averageScore : null,
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setDetail(null);
          setCommunityRating(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [mediaId, mediaType]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      disableScrollLock
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={isOpen}>
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
                    onClick={onClose}
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
                        : (detail as TVShowDetail).firstAirDate
                          ? new Date(
                              (detail as TVShowDetail).firstAirDate,
                            ).getFullYear()
                          : "Unknown year"}
                      {mediaType === "movie" &&
                        ` • ${(detail as MovieDetail).runtimeMinutes ?? "?"} min`}
                      {mediaType === "tv" &&
                        ` • ${(detail as TVShowDetail).totalSeasons ?? "?"} Seasons`}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}
                  >
                    {detail.genres.map((g) => (
                      <Chip key={g.id} label={g.name} size="small" />
                    ))}
                    <Chip
                      label={`TMDB ${detail.rating.toFixed(2)}/10`}
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={
                        communityRating == null
                          ? "Members No Rating"
                          : `Members ${(communityRating / 2).toFixed(1)}/5`
                      }
                      color="secondary"
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  <Typography variant="h6" gutterBottom>
                    Overview
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {detail.overview}
                  </Typography>

                  {mediaType === "movie" && (detail as MovieDetail).tagline && (
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
                        component={Link}
                        href={`/cast/${encodeURIComponent(member.name)}?image=${encodeURIComponent(member.profileUrl ?? "")}`}
                        sx={{
                          minWidth: "100px",
                          textAlign: "center",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        {member.profileUrl ? (
                          <Box
                            component="img"
                            src={member.profileUrl}
                            sx={{
                              width: "80px",
                              height: "120px",
                              objectFit: "cover",
                              borderRadius: 1,
                              mb: 1,
                              display: "block",
                              mx: "auto",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: "80px",
                              height: "120px",
                              borderRadius: 1,
                              mb: 1,
                              mx: "auto",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              color: "rgba(255,255,255,0.35)",
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 36 }} />
                          </Box>
                        )}
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ fontWeight: "bold", width: "100%" }}
                        >
                          {member.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ width: "100%" }}
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
                    onClick={onClose}
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
  );
}

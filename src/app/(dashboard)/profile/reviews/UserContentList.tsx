"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Box,
  Tabs,
  Typography,
  Paper,
  Stack,
  IconButton,
  Button,
  TextField,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { RatingRecord, ReviewRecord } from "@/types/media";
import {
  deleteRating,
  deleteReview,
  updateRating,
  updateReview,
} from "@/lib/user-content-api";
import { getMovieById, getTVShowById } from "@/lib/fetchAPI";

interface UserContentListProps {
  initialRatings: RatingRecord[];
  initialReviews: ReviewRecord[];
  accessToken: string;
}

interface MediaInfo {
  title: string;
  year: number | string | null;
  posterUrl: string | null;
}

interface UnifiedItem {
  id: string; // Composite key
  tmdbId: number;
  mediaType: "movie" | "tv";
  rating?: RatingRecord;
  review?: ReviewRecord;
  updatedAt: string;
}

export default function UserContentList({
  initialRatings,
  initialReviews,
  accessToken,
}: UserContentListProps) {
  const [ratings, setRatings] = useState(initialRatings);
  const [reviews, setReviews] = useState(initialReviews);
  const [mediaCache, setMediaCache] = useState<Record<string, MediaInfo>>({});

  // Dialog states
  const [editRating, setEditRating] = useState<RatingRecord | null>(null);
  const [editReview, setEditReview] = useState<ReviewRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "rating" | "review";
    id: number;
  } | null>(null);

  // Combine ratings and reviews by media ID
  const unifiedItems = useMemo(() => {
    const map = new Map<string, UnifiedItem>();

    ratings.forEach((r) => {
      const key = `${r.mediaType}-${r.tmdbId}`;
      map.set(key, {
        id: key,
        tmdbId: r.tmdbId,
        mediaType: r.mediaType,
        rating: r,
        updatedAt: r.updatedAt,
      });
    });

    reviews.forEach((rev) => {
      const key = `${rev.mediaType}-${rev.tmdbId}`;
      const existing = map.get(key);
      if (existing) {
        existing.review = rev;
        // Use the latest update date
        if (new Date(rev.updatedAt) > new Date(existing.updatedAt)) {
          existing.updatedAt = rev.updatedAt;
        }
      } else {
        map.set(key, {
          id: key,
          tmdbId: rev.tmdbId,
          mediaType: rev.mediaType,
          review: rev,
          updatedAt: rev.updatedAt,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [ratings, reviews]);

  // Fetch media info
  useEffect(() => {
    async function fetchMediaInfo() {
      for (const item of unifiedItems) {
        const key = item.id;
        if (mediaCache[key]) continue;

        try {
          if (item.mediaType === "movie") {
            const data = await getMovieById(item.tmdbId);
            setMediaCache((prev) => ({
              ...prev,
              [key]: {
                title: data.title,
                year: data.releaseYear,
                posterUrl: data.posterUrl,
              },
            }));
          } else {
            const data = await getTVShowById(item.tmdbId);
            setMediaCache((prev) => ({
              ...prev,
              [key]: {
                title: data.title,
                year: data.firstAirDate?.split("-")[0] || null,
                posterUrl: data.posterUrl,
              },
            }));
          }
        } catch (err) {
          console.error(`Failed to fetch media info for ${key}`, err);
        }
      }
    }

    void fetchMediaInfo();
  }, [unifiedItems, mediaCache]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === "rating") {
        await deleteRating(accessToken, deleteConfirm.id);
        setRatings((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
      } else {
        await deleteReview(accessToken, deleteConfirm.id);
        setReviews((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
      }
    } catch (err) {
      alert("Failed to delete item.");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleUpdateRating = async (newScore: number) => {
    if (!editRating) return;

    try {
      const updated = await updateRating(accessToken, editRating.id, newScore);
      setRatings((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
    } catch (err) {
      alert("Failed to update rating.");
    } finally {
      setEditRating(null);
    }
  };

  const handleUpdateReview = async (title: string, body: string) => {
    if (!editReview) return;

    try {
      const updated = await updateReview(accessToken, editReview.id, {
        title,
        body,
      });
      setReviews((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
    } catch (err) {
      alert("Failed to update review.");
    } finally {
      setEditReview(null);
    }
  };

  return (
    <Box>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ bgcolor: "rgba(255,255,255,0.02)", borderRadius: 2 }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: "rgba(255,255,255,0.05)" }}>
            <TableRow>
              <TableCell width={80}>Media</TableCell>
              <TableCell>Title & Rating</TableCell>
              <TableCell>Your Review</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {unifiedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No ratings or reviews found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              unifiedItems.map((item) => {
                const info = mediaCache[item.id];
                return (
                  <TableRow
                    key={item.id}
                    sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.04)" } }}
                  >
                    {/* Poster */}
                    <TableCell>
                      <Link href={`/media/${item.mediaType}/${item.tmdbId}`}>
                        <Avatar
                          variant="rounded"
                          src={info?.posterUrl || ""}
                          sx={{
                            width: 60,
                            height: 90,
                            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                            cursor: "pointer",
                            transition: "transform 0.2s",
                            "&:hover": { transform: "scale(1.05)" },
                          }}
                        >
                          {info?.title?.[0] || "?"}
                        </Avatar>
                      </Link>
                    </TableCell>

                    {/* Title & Rating */}
                    <TableCell sx={{ verticalAlign: "top" }}>
                      <Box sx={{ mb: 1 }}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          component={Link}
                          href={`/media/${item.mediaType}/${item.tmdbId}`}
                          sx={{
                            color: "inherit",
                            textDecoration: "none",
                            "&:hover": { color: "primary.main" },
                          }}
                        >
                          {info?.title || "Loading..."}{" "}
                          {info?.year && (
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              ({info.year})
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                      {item.rating ? (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Rating
                            value={item.rating.score / 2}
                            readOnly
                            precision={0.5}
                            size="small"
                            emptyIcon={
                              <StarBorderIcon
                                fontSize="inherit"
                                sx={{ color: "rgba(255,255,255,0.3)" }}
                              />
                            }
                          />
                          <Typography
                            variant="body2"
                            color="primary.main"
                            sx={{ ml: 1, fontWeight: 600 }}
                          >
                            {item.rating.score}/10
                          </Typography>
                          <IconButton
                            size="small"
                            sx={{ ml: 0.5 }}
                            onClick={() => setEditRating(item.rating!)}
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setDeleteConfirm({
                                type: "rating",
                                id: item.rating!.id,
                              })
                            }
                          >
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="text"
                          sx={{ textTransform: "none", p: 0 }}
                          component={Link}
                          href={`/media/${item.mediaType}/${item.tmdbId}`}
                        >
                          Add rating
                        </Button>
                      )}
                    </TableCell>

                    {/* Review Content */}
                    <TableCell sx={{ verticalAlign: "top" }}>
                      {item.review ? (
                        <Box>
                          {item.review.title && (
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              gutterBottom
                            >
                              {item.review.title}
                            </Typography>
                          )}
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {item.review.body}
                          </Typography>
                          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => setEditReview(item.review!)}
                              sx={{ fontSize: "0.75rem" }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "review",
                                  id: item.review!.id,
                                })
                              }
                              sx={{ fontSize: "0.75rem" }}
                            >
                              Delete
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="text"
                          sx={{ textTransform: "none", p: 0 }}
                          component={Link}
                          href={`/media/${item.mediaType}/${item.tmdbId}`}
                        >
                          Write a review
                        </Button>
                      )}
                    </TableCell>

                    {/* Navigation Actions */}
                    <TableCell align="right" sx={{ verticalAlign: "top" }}>
                      <Tooltip title="View Detail Page">
                        <IconButton
                          component={Link}
                          href={`/media/${item.mediaType}/${item.tmdbId}`}
                          color="primary"
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Rating Dialog */}
      <Dialog open={!!editRating} onClose={() => setEditRating(null)}>
        <DialogTitle>Edit Rating</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 2,
            }}
          >
            <Rating
              value={editRating ? editRating.score / 2 : 0}
              precision={0.5}
              size="large"
              onChange={(_, value) => {
                if (value !== null) {
                  void handleUpdateRating(Math.round(value * 2));
                }
              }}
              emptyIcon={<StarBorderIcon fontSize="inherit" />}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {editRating ? editRating.score : 0}/10
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRating(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Review Dialog */}
      <EditReviewDialog
        review={editReview}
        onClose={() => setEditReview(null)}
        onSave={handleUpdateReview}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {deleteConfirm?.type}? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function EditReviewDialog({
  review,
  onClose,
  onSave,
}: {
  review: ReviewRecord | null;
  onClose: () => void;
  onSave: (title: string, body: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (review) {
      setTitle(review.title || "");
      setBody(review.body);
    }
  }, [review]);

  return (
    <Dialog open={!!review} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Review</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Review"
            fullWidth
            multiline
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => onSave(title, body)}
          variant="contained"
          disabled={!body.trim()}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

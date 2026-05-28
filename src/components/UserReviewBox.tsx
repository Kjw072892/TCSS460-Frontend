"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { API_BASE } from "@/lib/api";
import { censorProfanity } from "@/lib/censor-profanity";
import type { MediaType } from "@/types/media";

interface UserReviewBoxProps {
  tmdbId: number;
  mediaType: MediaType;
}

export default function UserReviewBox({
  tmdbId,
  mediaType,
}: UserReviewBoxProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canPost = body.trim().length > 0 && session?.accessToken;

  async function handlePost() {
    if (!canPost || !session?.accessToken) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/v1/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          tmdbId,
          mediaType,
          title: title.trim() ? censorProfanity(title.trim()) : null,
          body: censorProfanity(body.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to post review: ${response.status}`);
      }

      setTitle("");
      setBody("");
      setSuccess(true);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Couldn't post your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderRadius: 2,
        p: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography
        variant="h6"
        fontWeight="bold"
        color="primary.main"
        sx={{ mb: "20px" }}
      >
        Write a review
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Your review has been posted!
        </Alert>
      )}

      <Box sx={{ display: "grid", gap: 1.5 }}>
        <TextField
          placeholder="Review title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          fullWidth
          size="small"
          disabled={submitting}
          slotProps={{
            htmlInput: {
              "aria-label": "Review title",
            },
          }}
        />
        <TextField
          placeholder="Comment or review"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          fullWidth
          multiline
          minRows={4}
          disabled={submitting}
          slotProps={{
            htmlInput: {
              "aria-label": "Comment or review",
            },
          }}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            disabled={!canPost || submitting}
            onClick={() => void handlePost()}
            startIcon={
              submitting ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            {submitting ? "Posting..." : "Post review"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

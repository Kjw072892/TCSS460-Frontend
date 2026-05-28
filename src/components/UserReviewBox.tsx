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
import type { MediaType } from "@/types/media";

interface UserReviewBoxProps {
  username: string;
  tmdbId: number;
  mediaType: MediaType;
}

export default function UserReviewBox({
  username,
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
          title: title.trim() || null,
          body: body.trim(),
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
        gutterBottom
        color="primary.main"
      >
        Write a review
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Posting as {username}
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
          label="Review title (optional)"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          fullWidth
          size="small"
          disabled={submitting}
        />
        <TextField
          label="Comment or review"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          fullWidth
          multiline
          minRows={4}
          disabled={submitting}
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

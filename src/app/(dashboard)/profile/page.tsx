import { redirect } from "next/navigation";
import { decodeJwt } from "jose";
import {
  Avatar,
  Box,
  Chip,
  Container,
  Divider,
  Paper,
  Typography,
  Stack,
} from "@mui/material";

import AppNavBar from "@/components/AppNavBar";
import { APP_CONFIG } from "@/config";
import { API_BASE } from "@/lib/api";
import { auth } from "@/lib/auth";
import { DEV_AUTH_SIMULATION_ENABLED, getEffectiveUser } from "@/lib/dev-user";

type DecodedProfileClaims = {
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
};

type MyRatingsTelemetry = {
  totalRatings: number;
  page: number;
  totalPages: number;
  results: Array<{
    createdAt?: string;
    updatedAt?: string;
  }>;
};

type MyReviewsTelemetry = {
  totalReviews: number;
  page: number;
  totalPages: number;
  results: Array<{
    createdAt?: string;
    updatedAt?: string;
  }>;
};

function toDisplayRows(
  rows: Array<[string, string | null | undefined | boolean]>,
) {
  return rows.filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
}

function toOptionalCount(value?: number | null) {
  return value === undefined || value === null ? undefined : String(value);
}

function formatDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleString();
}

export default async function ProfilePage() {
  const session = await auth();
  const user = getEffectiveUser(session?.user);

  if (!user && !DEV_AUTH_SIMULATION_ENABLED) {
    redirect(
      `/api/auth/signin?callbackUrl=${encodeURIComponent(APP_CONFIG.routes.profile)}`,
    );
  }

  let claims: DecodedProfileClaims | null = null;
  if (session?.idToken) {
    try {
      claims = decodeJwt(session.idToken) as DecodedProfileClaims;
    } catch {
      claims = null;
    }
  }

  const displayName =
    user?.name ||
    claims?.name ||
    [claims?.given_name, claims?.family_name].filter(Boolean).join(" ") ||
    claims?.preferred_username ||
    user?.email ||
    claims?.email ||
    "User";

  const avatarSrc = user?.image || claims?.picture || undefined;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const accountRows = toDisplayRows([
    ["Display name", displayName],
    ["Email", user?.email || claims?.email],
    ["Given name", claims?.given_name],
    ["Family name", claims?.family_name],
    ["Username", claims?.preferred_username],
    [
      "Email verified",
      typeof claims?.email_verified === "boolean"
        ? claims.email_verified
          ? "Yes"
          : "No"
        : undefined,
    ],
  ]);

  let ratingsTelemetry: MyRatingsTelemetry | null = null;
  let reviewsTelemetry: MyReviewsTelemetry | null = null;

  if (session?.accessToken) {
    const authHeaders = {
      Authorization: `Bearer ${session.accessToken}`,
    };

    const [ratingsResponse, reviewsResponse] = await Promise.allSettled([
      fetch(`${API_BASE}/v1/ratings/me?page=1`, {
        headers: authHeaders,
        cache: "no-store",
      }),
      fetch(`${API_BASE}/v1/reviews/me?page=1`, {
        headers: authHeaders,
        cache: "no-store",
      }),
    ]);

    if (ratingsResponse.status === "fulfilled" && ratingsResponse.value.ok) {
      ratingsTelemetry =
        (await ratingsResponse.value.json()) as MyRatingsTelemetry;
    }

    if (reviewsResponse.status === "fulfilled" && reviewsResponse.value.ok) {
      reviewsTelemetry =
        (await reviewsResponse.value.json()) as MyReviewsTelemetry;
    }
  }

  const latestRatingDate = formatDate(
    ratingsTelemetry?.results?.[0]?.updatedAt ||
      ratingsTelemetry?.results?.[0]?.createdAt,
  );
  const latestReviewDate = formatDate(
    reviewsTelemetry?.results?.[0]?.updatedAt ||
      reviewsTelemetry?.results?.[0]?.createdAt,
  );

  const telemetryRows = toDisplayRows([
    ["Ratings submitted", toOptionalCount(ratingsTelemetry?.totalRatings ?? 0)],
    ["Reviews written", toOptionalCount(reviewsTelemetry?.totalReviews ?? 0)],
    ["Latest rating activity", latestRatingDate],
    ["Latest review activity", latestReviewDate],
  ]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppNavBar callbackUrl={APP_CONFIG.routes.profile} />
      <Container
        maxWidth="lg"
        sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={3.5}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 4 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              background:
                "linear-gradient(135deg, rgba(255,193,7,0.12) 0%, rgba(255,255,255,0.04) 100%)",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Avatar
                src={avatarSrc}
                alt={displayName}
                sx={{
                  width: { xs: 84, md: 104 },
                  height: { xs: 84, md: 104 },
                  fontSize: { xs: 28, md: 36 },
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  fontWeight: 700,
                }}
              >
                {initials || "U"}
              </Avatar>

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="overline"
                  sx={{ color: "primary.main", letterSpacing: 1.2 }}
                >
                  Profile
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontSize: { xs: "2rem", md: "2.75rem" },
                    fontWeight: 700,
                  }}
                >
                  {displayName}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {user?.email || claims?.email || "No email available"}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  sx={{ mt: 2, rowGap: 1 }}
                >
                  <Chip
                    label={
                      DEV_AUTH_SIMULATION_ENABLED && !session
                        ? "Dev session"
                        : "Signed in"
                    }
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </Stack>
              </Box>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
              gutterBottom
              color="primary.main"
            >
              Account Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              {accountRows.map(([label, value]) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body1" sx={{ wordBreak: "break-word" }}>
                    {String(value)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          {telemetryRows.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                gutterBottom
                color="primary.main"
              >
                Activity Snapshot
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                {telemetryRows.map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ wordBreak: "break-word" }}
                    >
                      {String(value)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

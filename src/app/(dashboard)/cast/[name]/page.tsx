import { Avatar, Box, Container, Divider, Stack, Typography } from "@mui/material";

import AppNavBar from "@/components/AppNavBar";
import MediaCard from "@/components/MediaCard";
import { APP_CONFIG } from "@/config";
import { searchMoviesByCast, searchTVByCast } from "@/lib/media-api";
import type { MovieSummary, TVSummary } from "@/types/media";

interface PageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ image?: string }>;
}

async function fetchAllMovieCredits(name: string) {
  const firstPage = await searchMoviesByCast(name, 1);
  const remaining = await Promise.allSettled(
    Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) =>
      searchMoviesByCast(name, index + 2),
    ),
  );

  return [
    ...firstPage.results,
    ...remaining
      .filter(
        (result): result is PromiseFulfilledResult<typeof firstPage> =>
          result.status === "fulfilled",
      )
      .flatMap((result) => result.value.results),
  ];
}

async function fetchAllTVCredits(name: string) {
  const firstPage = await searchTVByCast(name, 1);
  const remaining = await Promise.allSettled(
    Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) =>
      searchTVByCast(name, index + 2),
    ),
  );

  return [
    ...firstPage.results,
    ...remaining
      .filter(
        (result): result is PromiseFulfilledResult<typeof firstPage> =>
          result.status === "fulfilled",
      )
      .flatMap((result) => result.value.results),
  ];
}

function dedupeById<T extends { id: number }>(items: T[]) {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function ResultsGrid({
  items,
  type,
}: {
  items: MovieSummary[] | TVSummary[];
  type: "movie" | "tv";
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)",
          sm: "repeat(3, 1fr)",
          md: "repeat(4, 1fr)",
          lg: "repeat(5, 1fr)",
          xl: "repeat(6, 1fr)",
        },
      }}
    >
      {items.map((item) => (
        <MediaCard
          key={`${type}-${item.id}`}
          type={type}
          item={item as MovieSummary & TVSummary}
        />
      ))}
    </Box>
  );
}

export default async function CastFilmographyPage({
  params,
  searchParams,
}: PageProps) {
  const { name } = await params;
  const { image } = await searchParams;
  const castName = decodeURIComponent(name);
  const castImage = image ? decodeURIComponent(image) : "";

  const [movies, tvShows] = await Promise.all([
    fetchAllMovieCredits(castName),
    fetchAllTVCredits(castName),
  ]);

  const dedupedMovies = dedupeById(movies);
  const dedupedTVShows = dedupeById(tvShows);
  const totalTitles = dedupedMovies.length + dedupedTVShows.length;

  return (
    <>
      <AppNavBar callbackUrl={`${APP_CONFIG.routes.search}`} />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={4}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2.5}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Avatar
              src={castImage || undefined}
              alt={castName}
              sx={{
                width: { xs: 84, md: 104 },
                height: { xs: 84, md: 104 },
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontSize: { xs: 28, md: 36 },
                fontWeight: 700,
              }}
            >
              {castName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("")}
            </Avatar>

            <Box>
              <Typography
                variant="overline"
                sx={{ color: "primary.main", letterSpacing: 1.2 }}
              >
                Cast Filmography
              </Typography>
              <Typography variant="h4" component="h1" fontWeight="bold">
                {castName}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {totalTitles.toLocaleString()} title
                {totalTitles !== 1 ? "s" : ""} found across movies and TV shows.
              </Typography>
            </Box>
          </Stack>

          <Divider />

          <Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              gutterBottom
              color="primary.main"
            >
              Movies
            </Typography>
            {dedupedMovies.length > 0 ? (
              <ResultsGrid items={dedupedMovies} type="movie" />
            ) : (
              <Typography color="text.secondary">
                No movie credits found.
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              gutterBottom
              color="primary.main"
            >
              TV Shows
            </Typography>
            {dedupedTVShows.length > 0 ? (
              <ResultsGrid items={dedupedTVShows} type="tv" />
            ) : (
              <Typography color="text.secondary">
                No TV credits found.
              </Typography>
            )}
          </Box>
        </Stack>
      </Container>
    </>
  );
}

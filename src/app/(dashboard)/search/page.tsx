import { Box, Container, Divider, Stack, Typography } from "@mui/material";

import AppNavBar from "@/components/AppNavBar";
import { searchMovies, searchTV } from "@/lib/media-api";
import SearchForm from "@/components/SearchForm";
import MediaCard from "@/components/MediaCard";
import SearchPagination from "@/components/SearchPagination";
import { ApiError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { APP_CONFIG } from "@/config";
import { getEffectiveUser } from "@/lib/dev-user";
import type { MovieSummary, TVSummary } from "@/types/media";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    movies?: string;
    tv?: string;
    year?: string;
    genreId?: string;
  }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = getEffectiveUser(session?.user);
  const {
    q,
    page = "1",
    movies,
    tv,
    year = "",
    genreId = "",
  } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const includeMovies =
    movies !== "0" && movies !== "false" && (movies === "1" || tv !== "1");
  const includeTV =
    tv !== "0" && tv !== "false" && (tv === "1" || movies !== "1");
  const hasCriteria = includeMovies || includeTV;

  // ── Search results (when query present) ──────────────────────────────────
  type CombinedResult =
    | (MovieSummary & { _type: "movie" })
    | (TVSummary & { _type: "tv" });
  const results: CombinedResult[] = [];
  let totalPages = 0;
  let totalResults = 0;
  let searchError: string | null = null;

  if (q) {
    try {
      const [moviesData, tvData] = await Promise.allSettled([
        includeMovies
          ? searchMovies(q, { page: pageNum, year, genreId })
          : Promise.resolve(null),
        includeTV
          ? searchTV(q, { page: pageNum, year, genreId })
          : Promise.resolve(null),
      ]);

      const movies =
        includeMovies && moviesData.status === "fulfilled" && moviesData.value
          ? moviesData.value.results.map((m) => ({
              ...m,
              _type: "movie" as const,
            }))
          : [];
      const tv =
        includeTV && tvData.status === "fulfilled" && tvData.value
          ? tvData.value.results.map((t) => ({ ...t, _type: "tv" as const }))
          : [];

      const len = Math.max(movies.length, tv.length);
      for (let i = 0; i < len; i++) {
        if (i < movies.length) results.push(movies[i]);
        if (i < tv.length) results.push(tv[i]);
      }
      totalResults =
        (includeMovies && moviesData.status === "fulfilled" && moviesData.value
          ? moviesData.value.totalResults
          : 0) +
        (includeTV && tvData.status === "fulfilled" && tvData.value
          ? tvData.value.totalResults
          : 0);
      totalPages = Math.max(
        includeMovies && moviesData.status === "fulfilled" && moviesData.value
          ? moviesData.value.totalPages
          : 0,
        includeTV && tvData.status === "fulfilled" && tvData.value
          ? tvData.value.totalPages
          : 0,
      );

      if (!hasCriteria) {
        searchError = "Select at least one category to search.";
      } else if (
        (!includeMovies || moviesData.status === "rejected") &&
        (!includeTV || tvData.status === "rejected")
      ) {
        searchError = "Search failed. Try again.";
      }
    } catch (e) {
      searchError =
        e instanceof ApiError
          ? `API error ${e.status}: ${e.statusText}`
          : "Search failed. Try again.";
    }
  }

  return (
    <>
      <AppNavBar callbackUrl={APP_CONFIG.routes.search} />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* ── Search bar ── */}
          <Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              fontWeight="bold"
            >
              Search
            </Typography>
            <SearchForm
              initialQ={q}
              initialMovies={includeMovies}
              initialTV={includeTV}
              initialYear={year}
              initialGenreId={genreId}
              signedInLabel={user?.name || user?.email || undefined}
              signInCallbackUrl={!user ? APP_CONFIG.routes.search : undefined}
            />
          </Box>

          <Divider />

          {/* ── Search results ── */}
          {q && (
            <>
              {searchError ? (
                <Typography color="error">{searchError}</Typography>
              ) : (
                <>
                  <Typography color="text.secondary">
                    {totalResults.toLocaleString()} result
                    {totalResults !== 1 ? "s" : ""} for &ldquo;
                    {q}&rdquo;
                  </Typography>

                  {results.length === 0 ? (
                    <Typography>No results found.</Typography>
                  ) : (
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
                      {results.map((item) => (
                        <MediaCard
                          key={`${item._type}-${item.id}`}
                          type={item._type}
                          item={item as unknown as MovieSummary & TVSummary}
                        />
                      ))}
                    </Box>
                  )}

                  {totalPages > 1 && (
                    <SearchPagination
                      q={q}
                      page={pageNum}
                      totalPages={totalPages}
                      includeMovies={includeMovies}
                      includeTV={includeTV}
                      year={year}
                      genreId={genreId}
                    />
                  )}
                </>
              )}
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

import { Box, Container, Divider, Stack, Typography } from "@mui/material";

import AppNavBar from "@/components/AppNavBar";
import {
  searchMovies,
  searchMoviesByCast,
  searchTV,
  searchTVByCast,
} from "@/lib/media-api";
import SearchForm from "@/components/SearchForm";
import MediaCard from "@/components/MediaCard";
import SearchPagination from "@/components/SearchPagination";
import { apiGet, ApiError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { APP_CONFIG } from "@/config";
import { getEffectiveUser } from "@/lib/dev-user";
import type { MovieSummary, TVDetail, TVSummary } from "@/types/media";

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

type CombinedResult =
  | (MovieSummary & { _type: "movie" })
  | (TVSummary & { _type: "tv" });

const FILTERED_PAGE_SIZE = 20;

function interleaveResults(
  movies: Array<MovieSummary & { _type: "movie" }>,
  tv: Array<TVSummary & { _type: "tv" }>,
): CombinedResult[] {
  const combined: CombinedResult[] = [];
  const len = Math.max(movies.length, tv.length);

  for (let i = 0; i < len; i++) {
    if (i < movies.length) combined.push(movies[i]);
    if (i < tv.length) combined.push(tv[i]);
  }

  return combined;
}

function dedupeCombinedResults(items: CombinedResult[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item._type}-${item.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function matchesTitleQuery(item: MovieSummary | TVSummary, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return !normalizedQuery || item.title.toLowerCase().includes(normalizedQuery);
}

function matchesMetadataFilters(
  item: MovieSummary | TVSummary,
  year: string,
  genreId: string,
) {
  const matchesYear =
    !year.trim() ||
    ("releaseYear" in item
      ? String(item.releaseYear ?? "") === year.trim()
      : (item.firstAirDate ?? "").slice(0, 4) === year.trim());
  const matchesGenre =
    !genreId.trim() ||
    item.genres.some((genre) => String(genre.id) === genreId.trim());

  return matchesYear && matchesGenre;
}

async function fetchAllPagedResults<T>(
  fetchPage: (page: number) => Promise<{
    totalPages: number;
    results: T[];
  }>,
) {
  const firstPage = await fetchPage(1);
  const pages = Array.from(
    { length: Math.max(firstPage.totalPages - 1, 0) },
    (_, index) => index + 2,
  );
  const remainingPages = await Promise.allSettled(
    pages.map((page) => fetchPage(page)),
  );

  return [
    ...firstPage.results,
    ...remainingPages
      .filter(
        (result): result is PromiseFulfilledResult<typeof firstPage> =>
          result.status === "fulfilled",
      )
      .flatMap((result) => result.value.results),
  ];
}

async function fetchMovieTitleResults(
  query: string,
  year: string,
  genreId: string,
) {
  const allResults = await fetchAllPagedResults((page) =>
    searchMovies(query, { page, year, genreId }),
  );
  return allResults.filter(
    (item) =>
      matchesTitleQuery(item, query) &&
      matchesMetadataFilters(item, year, genreId),
  );
}

async function fetchTVTitleResults(query: string, year: string, genreId: string) {
  const allResults = await fetchAllPagedResults((page) =>
    searchTV(query, { page, year, genreId }),
  );
  return allResults.filter(
    (item) =>
      matchesTitleQuery(item, query) &&
      matchesMetadataFilters(item, year, genreId),
  );
}

async function fetchMovieCastResults(
  query: string,
  year: string,
  genreId: string,
) {
  if (!query.trim()) {
    return [] as MovieSummary[];
  }

  const allResults = await fetchAllPagedResults((page) =>
    searchMoviesByCast(query, page),
  );
  return allResults.filter((item) => matchesMetadataFilters(item, year, genreId));
}

async function fetchTVCastResults(query: string, year: string, genreId: string) {
  if (!query.trim()) {
    return [] as TVSummary[];
  }

  const allResults = await fetchAllPagedResults((page) =>
    searchTVByCast(query, page),
  );
  return allResults.filter((item) => matchesMetadataFilters(item, year, genreId));
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
  const selectedMovies = movies === "1";
  const selectedTV = tv === "1";
  const includeMovies = selectedMovies || (!selectedMovies && !selectedTV);
  const includeTV = selectedTV || (!selectedMovies && !selectedTV);
  const hasCriteria = includeMovies || includeTV;
  const hasSearchInput =
    Boolean(q?.trim()) || Boolean(year.trim()) || Boolean(genreId.trim());

  const results: CombinedResult[] = [];
  let totalPages = 0;
  let totalResults = 0;
  let searchError: string | null = null;

  if (hasSearchInput) {
    try {
      const normalizedQuery = q?.trim() ?? "";
      const requestResults = await Promise.allSettled([
        includeMovies
          ? fetchMovieTitleResults(normalizedQuery, year, genreId)
          : Promise.resolve([]),
        includeTV
          ? fetchTVTitleResults(normalizedQuery, year, genreId)
          : Promise.resolve([]),
        includeMovies
          ? fetchMovieCastResults(normalizedQuery, year, genreId)
          : Promise.resolve([]),
        includeTV
          ? fetchTVCastResults(normalizedQuery, year, genreId)
          : Promise.resolve([]),
      ]);

      const titleMovies =
        requestResults[0].status === "fulfilled"
          ? requestResults[0].value.map((item) => ({
              ...item,
              _type: "movie" as const,
            }))
          : [];
      const titleTV =
        requestResults[1].status === "fulfilled"
          ? requestResults[1].value.map((item) => ({
              ...item,
              _type: "tv" as const,
            }))
          : [];
      const castMovies =
        requestResults[2].status === "fulfilled"
          ? requestResults[2].value.map((item) => ({
              ...item,
              _type: "movie" as const,
            }))
          : [];
      const castTV =
        requestResults[3].status === "fulfilled"
          ? requestResults[3].value.map((item) => ({
              ...item,
              _type: "tv" as const,
            }))
          : [];

      const combinedResults = dedupeCombinedResults(
        interleaveResults(
          [...titleMovies, ...castMovies],
          [...titleTV, ...castTV],
        ),
      );

      totalResults = combinedResults.length;
      totalPages = Math.max(
        1,
        Math.ceil(combinedResults.length / FILTERED_PAGE_SIZE),
      );
      results.push(
        ...combinedResults.slice(
          (pageNum - 1) * FILTERED_PAGE_SIZE,
          pageNum * FILTERED_PAGE_SIZE,
        ),
      );

      if (requestResults.every((result) => result.status === "rejected")) {
        searchError = "Search failed. Try again.";
      }

      if (!hasCriteria) {
        searchError = "Select at least one category to search.";
      }
    } catch (e) {
      searchError =
        e instanceof ApiError
          ? `API error ${e.status}: ${e.statusText}`
          : "Search failed. Try again.";
    }
  }

  const visibleTVResults = results.filter(
    (item): item is TVSummary & { _type: "tv" } => item._type === "tv",
  );
  const tvSeasonCounts = new Map<number, number | null>();

  if (visibleTVResults.length > 0) {
    const seasonDetails = await Promise.allSettled(
      visibleTVResults.map((item) =>
        apiGet<TVDetail>(`/v1/media/tv/${item.id}`),
      ),
    );

    visibleTVResults.forEach((item, index) => {
      const detail = seasonDetails[index];
      tvSeasonCounts.set(
        item.id,
        detail.status === "fulfilled" ? detail.value.totalSeasons : null,
      );
    });
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
              initialQ={q ?? ""}
              initialMovies={selectedMovies}
              initialTV={selectedTV}
              initialYear={year}
              initialGenreId={genreId}
              signInCallbackUrl={!user ? APP_CONFIG.routes.search : undefined}
            />
          </Box>

          <Divider />

          {/* ── Search results ── */}
          {hasSearchInput && (
            <>
              {searchError ? (
                <Typography color="error">{searchError}</Typography>
              ) : (
                <>
                  <Typography color="text.secondary">
                    {totalResults.toLocaleString()} result
                    {totalResults !== 1 ? "s" : ""}
                    {q?.trim() ? ` for “${q.trim()}”` : " for your filters"}
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
                          prioritizedGenreId={genreId || undefined}
                          seasonCount={
                            item._type === "tv"
                              ? (tvSeasonCounts.get(item.id) ?? null)
                              : null
                          }
                        />
                      ))}
                    </Box>
                  )}

                  {totalPages > 1 && (
                    <SearchPagination
                      q={q ?? ""}
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

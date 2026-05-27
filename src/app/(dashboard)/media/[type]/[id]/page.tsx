import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Avatar,
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import LockIcon from "@mui/icons-material/Lock";
import MovieIcon from "@mui/icons-material/Movie";

import AppNavBar from "@/components/AppNavBar";
import ReviewExcerpt from "@/components/ReviewExcerpt";
import UserReviewBox from "@/components/UserReviewBox";
import UserRatingStars from "@/components/UserRatingStars";
import { getMovieById, getTVShowById } from "@/lib/fetchAPI";
import {
  enrichedMovie,
  enrichedTV,
  getTitleRatings,
  popularMoviesMultiPage,
  popularTVMultiPage,
  searchMovies,
  searchTV,
} from "@/lib/media-api";
import { apiGet, ApiError } from "@/lib/api";
import HorizontalScroller from "@/components/HorizontalScroller";
import { auth } from "@/lib/auth";
import { getEffectiveUser } from "@/lib/dev-user";
import type {
  MovieDetail as RawMovieDetail,
  TVShowDetail as RawTVShowDetail,
} from "@/types/backendObjects";
import type {
  CastMember,
  MovieDetail,
  Community,
  MovieSummary,
  TVDetail,
  TVSummary,
} from "@/types/media";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

function getTitleYear(item: MovieDetail | TVDetail): number | null {
  if ("releaseYear" in item) {
    return item.releaseYear ?? null;
  }

  return item.firstAirDate ? Number(item.firstAirDate.slice(0, 4)) : null;
}

function buildSeriesSearchQuery(title: string) {
  return title
    .split(":")[0]
    .replace(/\b(vol\.?|volume|part|chapter)\b.*$/i, "")
    .replace(/\b[ivx]+\b$/i, "")
    .replace(/\b\d+\b$/i, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function MediaDetailPage({ params }: PageProps) {
  const { type, id } = await params;
  const session = await auth();
  const user = getEffectiveUser(session?.user);

  if (type !== "movie" && type !== "tv") notFound();

  let tmdb: MovieDetail | TVDetail;
  let community: Community;
  let ratingsAverage: number | null = null;
  let ratingsCount = 0;
  let tmdbRating: number | null = null;

  try {
    if (type === "movie") {
      const [data, rawDetail, ratings] = await Promise.all([
        enrichedMovie(id),
        getMovieById(Number(id)),
        getTitleRatings(id, "movie"),
      ]);
      tmdb = data.tmdb;
      community = data.community;
      ratingsAverage = ratings.totalRatings > 0 ? ratings.averageScore : null;
      ratingsCount = ratings.totalRatings;
      tmdbRating = (rawDetail as RawMovieDetail).rating;
    } else {
      const [data, rawDetail, ratings] = await Promise.all([
        enrichedTV(id),
        getTVShowById(Number(id)),
        getTitleRatings(id, "tv"),
      ]);
      tmdb = data.tmdb;
      community = data.community;
      ratingsAverage = ratings.totalRatings > 0 ? ratings.averageScore : null;
      ratingsCount = ratings.totalRatings;
      tmdbRating = (rawDetail as RawTVShowDetail).rating;
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const movieDetail = type === "movie" ? (tmdb as MovieDetail) : null;
  const tvDetail = type === "tv" ? (tmdb as TVDetail) : null;

  const year =
    movieDetail?.releaseYear?.toString() ??
    tvDetail?.firstAirDate?.slice(0, 4) ??
    null;

  const meta: string[] = [];
  if (year) meta.push(year);
  if (movieDetail?.runtimeMinutes)
    meta.push(`${movieDetail.runtimeMinutes} min`);
  if (tvDetail?.totalSeasons)
    meta.push(
      `${tvDetail.totalSeasons} season${tvDetail.totalSeasons !== 1 ? "s" : ""}`,
    );
  if (tvDetail?.totalEpisodes) meta.push(`${tvDetail.totalEpisodes} episodes`);
  if (tmdb.status) meta.push(tmdb.status);

  const mainYear = getTitleYear(tmdb);
  const mainGenreIds = new Set(tmdb.genres.map((genre) => genre.id));
  const mainCastNames = new Set(
    tmdb.cast.map((member) => member.name.trim().toLowerCase()),
  );
  const seriesSearchQuery = buildSeriesSearchQuery(tmdb.title);

  const [discoveryPool, seriesSearchResults] = await Promise.all([
    type === "movie" ? popularMoviesMultiPage(10) : popularTVMultiPage(10),
    seriesSearchQuery.length >= 3
      ? type === "movie"
        ? searchMovies(seriesSearchQuery, { page: 1 })
        : searchTV(seriesSearchQuery, { page: 1 })
      : Promise.resolve({
          results: [],
          page: 1,
          totalPages: 0,
          totalResults: 0,
        } as {
          results: Array<MovieSummary | TVSummary>;
          page: number;
          totalPages: number;
          totalResults: number;
        }),
  ]);

  const baseSimilarIds = new Set(tmdb.similar.map((similar) => similar.id));
  const discoveryCandidateIds = discoveryPool
    .filter((candidate) => candidate.id !== tmdb.id)
    .map((candidate) => candidate.id)
    .filter((candidateId) => !baseSimilarIds.has(candidateId))
    .slice(0, 40);

  const seriesCandidateIds = seriesSearchResults.results
    .filter((candidate) => candidate.id !== tmdb.id)
    .map((candidate) => candidate.id)
    .filter((candidateId) => !baseSimilarIds.has(candidateId))
    .slice(0, 12);

  const candidateIds = [
    ...tmdb.similar.map((similar) => similar.id),
    ...seriesCandidateIds,
    ...discoveryCandidateIds,
  ];

  const similarDetails = await Promise.allSettled(
    candidateIds.map((candidateId) =>
      type === "movie"
        ? apiGet<MovieDetail>(`/v1/media/movies/${candidateId}`)
        : apiGet<TVDetail>(`/v1/media/tv/${candidateId}`),
    ),
  );

  const scoredSimilar = similarDetails
    .filter(
      (result): result is PromiseFulfilledResult<MovieDetail | TVDetail> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value)
    .map((similar) => {
      const genreOverlapCount = similar.genres.filter((genre) =>
        mainGenreIds.has(genre.id),
      ).length;
      const sharedCastCount = similar.cast.filter((member) =>
        mainCastNames.has(member.name.trim().toLowerCase()),
      ).length;
      const hasSharedGenre = genreOverlapCount > 0;
      const hasSharedCastMember = sharedCastCount > 0;

      const similarYear = getTitleYear(similar);
      const score =
        sharedCastCount * 4 +
        genreOverlapCount * 2 +
        (mainYear != null && similarYear != null
          ? Math.max(0, 2 - Math.abs(similarYear - mainYear))
          : 0);

      return {
        similar,
        hasSharedGenre,
        hasSharedCastMember,
        genreOverlapCount,
        sharedCastCount,
        score,
      };
    });

  const filteredSimilar = scoredSimilar
    .filter(
      ({ hasSharedGenre, hasSharedCastMember }) =>
        hasSharedGenre && hasSharedCastMember,
    )
    .sort((a, b) => {
      if (a.sharedCastCount !== b.sharedCastCount) {
        return b.sharedCastCount - a.sharedCastCount;
      }
      if (a.genreOverlapCount !== b.genreOverlapCount) {
        return b.genreOverlapCount - a.genreOverlapCount;
      }
      return b.score - a.score;
    })
    .map(({ similar }) => similar);

  const castOnlySimilar = scoredSimilar
    .filter(
      ({ hasSharedGenre, hasSharedCastMember }) =>
        hasSharedCastMember && !hasSharedGenre,
    )
    .sort((a, b) => {
      if (a.sharedCastCount !== b.sharedCastCount) {
        return b.sharedCastCount - a.sharedCastCount;
      }
      return b.score - a.score;
    })
    .map(({ similar }) => similar);

  const genreOnlySimilar = scoredSimilar
    .filter(
      ({ hasSharedGenre, hasSharedCastMember }) =>
        hasSharedGenre && !hasSharedCastMember,
    )
    .sort((a, b) => {
      if (a.genreOverlapCount !== b.genreOverlapCount) {
        return b.genreOverlapCount - a.genreOverlapCount;
      }
      return b.score - a.score;
    })
    .map(({ similar }) => similar);

  const seenMoreLikeThisIds = new Set<number>();
  const moreLikeThisTitles = [
    ...filteredSimilar,
    ...castOnlySimilar,
    ...genreOnlySimilar,
  ].filter((similar) => {
    if (seenMoreLikeThisIds.has(similar.id)) {
      return false;
    }
    seenMoreLikeThisIds.add(similar.id);
    return true;
  });

  return (
    <Box>
      <AppNavBar callbackUrl={`/media/${type}/${id}`} />
      {/* ── Backdrop ── */}
      <Box
        sx={{
          position: "relative",
          height: { xs: 240, md: 520 },
          overflow: "hidden",
          bgcolor: "background.paper",
          ...(tmdb.backdropUrl
            ? {
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${tmdb.backdropUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(28px)",
                  transform: "scale(1.08)",
                  opacity: 0.28,
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to right, rgba(18,18,18,0.88) 0%, rgba(18,18,18,0.18) 14%, rgba(18,18,18,0.18) 86%, rgba(18,18,18,0.88) 100%), linear-gradient(to bottom, rgba(18,18,18,0.08) 0%, rgba(18,18,18,0.62) 100%)",
                },
              }
            : {}),
        }}
      >
        {tmdb.backdropUrl && (
          <Box
            component="img"
            src={tmdb.backdropUrl}
            alt=""
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              position: "relative",
              zIndex: 1,
              opacity: 0.82,
            }}
          />
        )}
      </Box>

      <Container
        maxWidth="lg"
        sx={{
          mt: 0,
          pt: { xs: 2.5, md: 4 },
          px: { xs: 2, sm: 3 },
          position: "relative",
          pb: 6,
        }}
      >
        <Stack spacing={5}>
          {/* ── Hero ── */}
          <Box
            sx={{
              display: "flex",
              gap: { xs: 2, md: 4 },
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "center", sm: "flex-end" },
            }}
          >
            {/* Poster */}
            <Box
              component="img"
              src={
                tmdb.posterUrl ??
                (type === "movie"
                  ? "/movie-placeholder.svg"
                  : "/tv-placeholder.svg")
              }
              alt={tmdb.title}
              sx={{
                width: { xs: 140, md: 200 },
                flexShrink: 0,
                borderRadius: 2,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            />

            {/* Info */}
            <Box sx={{ pb: { sm: 1 } }}>
              <Typography
                variant="h4"
                fontWeight="bold"
                gutterBottom
                sx={{
                  fontSize: { xs: "2rem", sm: "2.5rem" },
                  textAlign: { xs: "center", sm: "left" },
                }}
              >
                {tmdb.title}
              </Typography>

              {"tagline" in tmdb && tmdb.tagline && (
                <Typography
                  variant="subtitle1"
                  color="text.secondary"
                  fontStyle="italic"
                  gutterBottom
                >
                  {tmdb.tagline}
                </Typography>
              )}

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {meta.join(" · ")}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  mt: 1,
                  justifyContent: { xs: "center", sm: "flex-start" },
                }}
              >
                {tmdb.genres.map((g) => (
                  <Chip key={g.id} label={g.name ?? g.id} size="small" />
                ))}
                {typeof tmdbRating === "number" && (
                  <Chip
                    label={`TMDB ${tmdbRating.toFixed(2)}/10`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                )}
              </Box>

              {/* Community rating */}
              <Typography
                variant="overline"
                sx={{
                  display: "block",
                  mt: 2.5,
                  color: "text.secondary",
                  letterSpacing: 1,
                }}
              >
                Member ratings
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mt: 0.25,
                  flexWrap: "wrap",
                  justifyContent: { xs: "center", sm: "flex-start" },
                }}
              >
                <StarIcon sx={{ color: "primary.main" }} />
                <Typography fontWeight="bold" fontSize="1.1rem">
                  {ratingsAverage != null
                    ? `${(ratingsAverage / 2).toFixed(1)}/5`
                    : "No ratings yet"}
                </Typography>
                {ratingsCount > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    ({ratingsCount} rating
                    {ratingsCount !== 1 ? "s" : ""})
                  </Typography>
                )}
              </Box>

              {user ? (
                <UserRatingStars tmdbId={Number(id)} mediaType={type} />
              ) : (
                <Box
                  sx={{
                    mt: 1.5,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    color: "text.disabled",
                  }}
                >
                  <LockIcon fontSize="small" />
                  <Typography variant="body2">Sign in to rate</Typography>
                </Box>
              )}

              {/* Networks */}
              {tvDetail?.networks && tvDetail.networks.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    mt: 2,
                    alignItems: "center",
                  }}
                >
                  {tvDetail.networks.map((n) =>
                    n.logoUrl ? (
                      <Box
                        key={n.name}
                        component="img"
                        src={n.logoUrl}
                        alt={n.name}
                        sx={{
                          height: 24,
                          objectFit: "contain",
                          filter: "brightness(0) invert(1)",
                          opacity: 0.7,
                        }}
                      />
                    ) : (
                      <Typography
                        key={n.name}
                        variant="caption"
                        color="text.secondary"
                      >
                        {n.name}
                      </Typography>
                    ),
                  )}
                </Box>
              )}
            </Box>
          </Box>

          <Divider />

          {/* ── Overview ── */}
          <Box>
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
              color="primary.main"
            >
              Overview
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ lineHeight: 1.8 }}
            >
              {tmdb.overview}
            </Typography>
          </Box>

          <Divider />

          {/* ── Cast ── */}
          {tmdb.cast && tmdb.cast.length > 0 && (
            <Box>
              <Typography
                variant="h6"
                fontWeight="bold"
                gutterBottom
                color="primary.main"
              >
                Cast
              </Typography>
              <HorizontalScroller infinite={false}>
                {tmdb.cast.map((member: CastMember) => (
                  <Box
                    key={`${member.name}-${member.character}`}
                    component={Link}
                    href={`/cast/${encodeURIComponent(member.name)}?image=${encodeURIComponent(member.profileUrl ?? "")}`}
                    sx={{
                      minWidth: 90,
                      maxWidth: 90,
                      textAlign: "center",
                      flexShrink: 0,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <Avatar
                      src={member.profileUrl ?? undefined}
                      alt={member.name}
                      sx={{ width: 72, height: 72, mx: "auto", mb: 0.75 }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      display="block"
                      noWrap
                    >
                      {member.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {member.character}
                    </Typography>
                  </Box>
                ))}
              </HorizontalScroller>
            </Box>
          )}

          {/* ── Similar titles ── */}
          {moreLikeThisTitles.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  color="primary.main"
                >
                  More Like This
                </Typography>
                <HorizontalScroller infinite={false}>
                  {moreLikeThisTitles.map((s) => (
                    <Box
                      key={s.id}
                      component="a"
                      href={`/media/${type}/${s.id}`}
                      sx={{
                        minWidth: { xs: 104, sm: 120 },
                        maxWidth: { xs: 104, sm: 120 },
                        flexShrink: 0,
                        textDecoration: "none",
                      }}
                    >
                      {s.posterUrl ? (
                        <Box
                          component="img"
                          src={s.posterUrl}
                          alt={s.title}
                          sx={{
                            width: "100%",
                            aspectRatio: "2/3",
                            objectFit: "cover",
                            borderRadius: 1,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: "100%",
                            aspectRatio: "2/3",
                            borderRadius: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            px: 1.5,
                            textAlign: "center",
                            background:
                              "linear-gradient(180deg, rgba(255,193,7,0.18) 0%, rgba(255,255,255,0.06) 100%)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.7)",
                          }}
                        >
                          <MovieIcon
                            sx={{ fontSize: 30, color: "primary.main" }}
                          />
                          <Typography
                            variant="caption"
                            sx={{ color: "rgba(255,255,255,0.7)" }}
                          >
                            No poster available
                          </Typography>
                        </Box>
                      )}
                      <Typography
                        variant="caption"
                        display="block"
                        noWrap
                        mt={0.5}
                      >
                        {s.title}
                      </Typography>
                      {getTitleYear(s) && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {getTitleYear(s)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </HorizontalScroller>
              </Box>
            </>
          )}

          {user && (
            <>
              <Divider />
              <UserReviewBox
                username={user.name || user.email || "Signed in user"}
              />
            </>
          )}

          {/* ── Recent reviews ── */}
          {community.recentReviews.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  color="primary.main"
                >
                  Recent Reviews
                </Typography>
                <Stack spacing={2}>
                  {community.recentReviews.map((r) => (
                    <ReviewExcerpt
                      key={r.id}
                      title={r.title}
                      body={r.body}
                      author={r.author}
                    />
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

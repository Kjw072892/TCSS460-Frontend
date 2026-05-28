export type MediaType = "movie" | "tv";

export interface CastMember {
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface SimilarTitle {
  id: number;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
}

export interface Network {
  name: string;
  logoUrl: string | null;
}

export interface Season {
  seasonNumber: number;
  episodeCount: number;
  airDate: string | null;
  posterUrl: string | null;
}

export interface Community {
  averageRating: number | null;
  reviewCount: number;
  recentReviews: Array<{
    id: number;
    title: string;
    body: string;
    author?: string | { name?: string | null } | null;
  }>;
}

export interface MovieDetail {
  id: number;
  title: string;
  tagline: string | null;
  overview: string;
  releaseYear: number | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  status: string | null;
  genres: Genre[];
  cast: CastMember[];
  similar: SimilarTitle[];
}

export interface TVDetail {
  id: number;
  title: string;
  overview: string;
  firstAirDate: string | null;
  lastAirDate: string | null;
  status: string | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
  averageEpisodeMinutes: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: Genre[];
  networks: Network[];
  seasons: Season[];
  cast: CastMember[];
  similar: SimilarTitle[];
}

export interface EnrichedMovie {
  tmdb: MovieDetail;
  community: Community;
}

export interface EnrichedTV {
  tmdb: TVDetail;
  community: Community;
}

export interface Genre {
  id: number;
  name?: string;
}

export interface MovieSummary {
  id: number;
  title: string;
  overview: string;
  releaseYear: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: Genre[];
}

export interface TVSummary {
  id: number;
  title: string;
  overview: string;
  firstAirDate: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: Genre[];
}

export interface PagedResponse<T> {
  results: T[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface RatingAuthor {
  id?: string;
  username?: string;
}

export interface RatingRecord {
  id: number;
  tmdbId: number;
  mediaType: MediaType;
  score: number;
  userId: number;
  author?: RatingAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface RatingListResponse {
  tmdbId: number;
  mediaType: MediaType;
  averageScore: number;
  totalRatings: number;
  page: number;
  totalPages: number;
  results: RatingRecord[];
}

export interface MyRatingListResponse {
  totalRatings: number;
  page: number;
  totalPages: number;
  results: RatingRecord[];
}

export interface ReviewRecord {
  id: number;
  tmdbId: number;
  mediaType: MediaType;
  title: string | null;
  body: string;
  userId: number;
  author?: RatingAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface MyReviewListResponse {
  totalReviews: number;
  page: number;
  totalPages: number;
  results: ReviewRecord[];
}

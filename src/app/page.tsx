import {
  Box,
  Container,
  Stack,
  Typography,
  AppBar,
  Toolbar,
} from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";

import HomeSignInButton from "@/components/HomeSignInButton";
import MediaCarousel from "@/components/CarouselTemplate";
import SearchForm from "@/components/SearchForm";
import GenreRow, { groupByGenre } from "@/components/GenreRow";
import UserAccountMenu from "@/components/UserAccountMenu";
import { getPopularMovies, getPopularTVShows } from "@/lib/fetchAPI";
import { popularMoviesMultiPage, popularTVMultiPage } from "@/lib/media-api";
import { auth } from "@/lib/auth";
import { APP_CONFIG } from "@/config";
import { getEffectiveUser } from "@/lib/dev-user";
import { MovieCard, TVShowCard } from "@/types/backendObjects";

/**
 * Public landing page.
 */
export default async function HomePage() {
  const session = await auth();
  const user = getEffectiveUser(session?.user);

  let movies: MovieCard[] = [];
  let tvShows: TVShowCard[] = [];
  let genreRows: [
    string,
    ReturnType<typeof groupByGenre> extends Map<string, infer V> ? V : never,
  ][] = [];
  let browseError = false;
  try {
    const [movieRes, tvRes, browseMovies, browseTV] = await Promise.all([
      getPopularMovies(1),
      getPopularTVShows(1),
      popularMoviesMultiPage(8),
      popularTVMultiPage(8),
    ]);
    movies = movieRes.results;
    tvShows = tvRes.results;
    const grouped = groupByGenre(browseMovies, browseTV);
    genreRows = [...grouped.entries()]
      .filter(([, items]) => items.length >= 3)
      .sort((a, b) => b[1].length - a[1].length);
  } catch (e) {
    console.error("Failed to fetch media for home page:", e);
    browseError = true;
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <AppBar
        position="static"
        sx={{ bgcolor: "#000", borderBottom: "1px solid #333" }}
        elevation={0}
      >
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Toolbar
            disableGutters
            sx={{ justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <MovieIcon sx={{ color: "primary.main", fontSize: 32 }} />
              <Typography
                variant="h6"
                component="div"
                sx={{
                  color: "primary.main",
                  fontWeight: "bold",
                  letterSpacing: 0.5,
                  display: { xs: "none", sm: "block" },
                }}
              >
                7MDB
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: { xs: "100%", md: 560 },
                maxWidth: { xs: "100%", md: 1120 },
                order: { xs: 3, md: 2 },
              }}
            >
              <SearchForm destination={APP_CONFIG.routes.search} compact />
            </Box>

            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ order: { xs: 2, md: 3 } }}
            >
              {user && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    fontWeight: "medium",
                    display: { xs: "none", md: "block" },
                  }}
                >
                  Welcome
                </Typography>
              )}

              {user ? (
                <UserAccountMenu label={user.name || user.email || "Signed in"} />
              ) : (
                <HomeSignInButton callbackUrl={APP_CONFIG.routes.home} />
              )}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h4"
            sx={{
              color: "primary.main",
              mb: 2,
              textAlign: "left",
              fontWeight: "bold",
            }}
          >
            Popular Movies
          </Typography>
          <Box sx={{ mx: { xs: -2, sm: -3, md: -4 } }}>
            <MediaCarousel
              items={movies}
              mediaType="movie"
              infinite={movies.length >= 10}
            />
          </Box>
        </Box>

        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h4"
            sx={{
              color: "primary.main",
              mb: 2,
              textAlign: "left",
              fontWeight: "bold",
            }}
          >
            Popular TV Shows
          </Typography>
          <Box sx={{ mx: { xs: -2, sm: -3, md: -4 } }}>
            <MediaCarousel
              items={tvShows}
              mediaType="tv"
              infinite={tvShows.length >= 10}
            />
          </Box>
        </Box>

        <Stack spacing={3}>
          <Box>
            <Typography
              variant="h5"
              component="h2"
              fontWeight="bold"
              gutterBottom
              sx={{ color: "primary.main" }}
            >
              Explore
            </Typography>
            <Typography color="text.secondary">
              Browse trending movies and TV shows by genre.
            </Typography>
          </Box>

          {genreRows.length === 0 ? (
            <Typography color="text.secondary">
              {browseError
                ? "Popular titles could not be loaded right now."
                : "Popular titles will appear here once the API loads."}
            </Typography>
          ) : (
            genreRows.map(([genre, items]) => (
              <GenreRow key={genre} genre={genre} items={items} />
            ))
          )}
        </Stack>
      </Container>
    </Box>
  );
}

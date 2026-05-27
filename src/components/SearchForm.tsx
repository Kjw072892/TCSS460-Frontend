"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Popover,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";

import HomeSignInButton from "@/components/HomeSignInButton";
import { MEDIA_GENRES, getGenreNameById } from "@/lib/media-filters";

interface Props {
  initialQ?: string;
  initialMovies?: boolean;
  initialTV?: boolean;
  initialYear?: string;
  initialGenreId?: string;
  destination?: string;
  compact?: boolean;
  signInCallbackUrl?: string;
}

export default function SearchForm({
  initialQ = "",
  initialMovies = false,
  initialTV = false,
  initialYear = "",
  initialGenreId = "",
  destination = "/search",
  compact = false,
  signInCallbackUrl,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [includeMovies, setIncludeMovies] = useState(initialMovies);
  const [includeTV, setIncludeTV] = useState(initialTV);
  const [year, setYear] = useState(initialYear);
  const [genreId, setGenreId] = useState(initialGenreId);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const canSearch = Boolean(q.trim());
  const open = Boolean(anchorEl);
  const showDefaultHelper = !includeMovies && !includeTV;
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (includeMovies) count += 1;
    if (includeTV) count += 1;
    if (year.trim()) count += 1;
    if (genreId.trim()) count += 1;
    return count;
  }, [genreId, includeMovies, includeTV, year]);

  function runSearch() {
    if (!canSearch) return;
    const params = new URLSearchParams({ page: "1" });
    if (q.trim()) params.set("q", q.trim());
    if (includeMovies) params.set("movies", "1");
    if (includeTV) params.set("tv", "1");
    if (year.trim()) params.set("year", year.trim());
    if (genreId.trim()) params.set("genreId", genreId.trim());
    router.push(`${destination}?${params}`);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    runSearch();
  }

  function resetFilters() {
    setIncludeMovies(false);
    setIncludeTV(false);
    setYear("");
    setGenreId("");
  }

  const filterSummary = [
    !includeMovies || !includeTV
      ? includeMovies
          ? "Movies only"
          : includeTV
            ? "TV only"
            : null
      : null,
    year.trim() ? `Year ${year.trim()}` : null,
    genreId.trim()
      ? getGenreNameById(Number(genreId)) || `Genre ${genreId.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        gap: compact ? 1 : 2,
        flexWrap: "wrap",
        alignItems: "center",
        width: compact ? "100%" : "auto",
      }}
    >
      <TextField
        label="Search"
        helperText="Search by title or cast member."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        variant="outlined"
        size="small"
        sx={{
          flexGrow: 1,
          minWidth: compact ? { xs: "100%", md: 520 } : { xs: "100%", sm: 260 },
          "& .MuiFormHelperText-root": {
            color: "text.disabled",
          },
        }}
        autoFocus={!compact}
      />

      <Button
        type="button"
        variant="outlined"
        startIcon={<TuneIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          whiteSpace: "nowrap",
          width: { xs: compact ? "calc(50% - 4px)" : "auto", sm: "auto" },
        }}
      >
        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
      </Button>

      <Button
        type="submit"
        variant="contained"
        startIcon={<SearchIcon />}
        disabled={!canSearch}
        sx={{
          whiteSpace: "nowrap",
          width: { xs: compact ? "calc(50% - 4px)" : "auto", sm: "auto" },
        }}
      >
        Search
      </Button>

      {signInCallbackUrl && (
        <HomeSignInButton callbackUrl={signInCallbackUrl} />
      )}

      {!!filterSummary && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ width: "100%" }}
        >
          Active filters: {filterSummary}
        </Typography>
      )}

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "calc(100vw - 32px)", sm: 360 },
              maxWidth: "calc(100vw - 32px)",
            },
          },
        }}
      >
        <Box sx={{ width: "100%", p: 2, display: "grid", gap: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Refine Search
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeMovies}
                  onChange={(e) => setIncludeMovies(e.target.checked)}
                />
              }
              label="Search movies"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeTV}
                  onChange={(e) => setIncludeTV(e.target.checked)}
                />
              }
              label="Search TV shows"
            />
          </FormGroup>

          {showDefaultHelper && (
            <Typography variant="caption" color="text.disabled">
              Search defaults to movies and TV shows.
            </Typography>
          )}

          <Divider />

          <TextField
            label="Release / Air Year"
            value={year}
            onChange={(e) =>
              setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
            }
            size="small"
            placeholder="e.g. 2024"
            inputMode="numeric"
          />

          <TextField
            select
            label="Genre"
            value={genreId}
            onChange={(e) => setGenreId(String(e.target.value))}
            size="small"
          >
            <MenuItem value="">Any genre</MenuItem>
            {MEDIA_GENRES.map((genre) => (
              <MenuItem key={genre.id} value={String(genre.id)}>
                {genre.name}
              </MenuItem>
            ))}
          </TextField>

          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}
          >
            <Button type="button" onClick={resetFilters}>
              Reset
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={() => {
                setAnchorEl(null);
                runSearch();
              }}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}

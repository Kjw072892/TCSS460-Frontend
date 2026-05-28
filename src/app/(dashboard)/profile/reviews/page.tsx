import { redirect } from "next/navigation";
import { Container, Typography, Box, Stack } from "@mui/material";

import AppNavBar from "@/components/AppNavBar";
import { APP_CONFIG } from "@/config";
import { auth } from "@/lib/auth";
import { getMyRatings, getMyReviews } from "@/lib/user-content-api";
import UserContentList from "./UserContentList";

export default async function UserReviewsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user || !session?.accessToken) {
    redirect(
      `/api/auth/signin?callbackUrl=${encodeURIComponent(APP_CONFIG.routes.userReviews)}`,
    );
  }

  // Fetch initial data
  const [ratingsResult, reviewsResult] = await Promise.allSettled([
    getMyRatings(session.accessToken),
    getMyReviews(session.accessToken),
  ]);

  const ratingsData =
    ratingsResult.status === "fulfilled" ? ratingsResult.value : null;
  const reviewsData =
    reviewsResult.status === "fulfilled" ? reviewsResult.value : null;

  const ratingsError =
    ratingsResult.status === "rejected" ? ratingsResult.reason : null;
  const reviewsError =
    reviewsResult.status === "rejected" ? reviewsResult.reason : null;

  if (ratingsError || reviewsError) {
    console.error("UserContent Error:", { ratingsError, reviewsError });
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppNavBar callbackUrl={APP_CONFIG.routes.userReviews} />
      <Container
        maxWidth="md"
        sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, sm: 3 } }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mb: 1, color: "primary.main" }}
        >
          Your Content
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Manage your ratings, reviews, and comments below.
        </Typography>

        {(ratingsError || reviewsError) && (
          <Typography color="error" sx={{ mb: 2 }}>
            Some content could not be loaded. Please ensure you are signed in
            correctly.
          </Typography>
        )}

        <UserContentList
          initialRatings={ratingsData?.results ?? []}
          initialReviews={reviewsData?.results ?? []}
          accessToken={session.accessToken}
        />
      </Container>
    </Box>
  );
}

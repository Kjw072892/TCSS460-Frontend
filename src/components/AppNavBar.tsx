import Link from "next/link";
import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
} from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";

import HomeSignInButton from "@/components/HomeSignInButton";
import UserAccountMenu from "@/components/UserAccountMenu";
import { APP_CONFIG } from "@/config";
import { auth } from "@/lib/auth";
import { getEffectiveUser } from "@/lib/dev-user";

interface AppNavBarProps {
  callbackUrl?: string;
}

export default async function AppNavBar({
  callbackUrl = APP_CONFIG.routes.home,
}: AppNavBarProps) {
  const session = await auth();
  const user = getEffectiveUser(session?.user);

  return (
    <AppBar
      position="static"
      sx={{ bgcolor: "#000", borderBottom: "1px solid #333" }}
      elevation={0}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Toolbar
          disableGutters
          sx={{ justifyContent: "space-between", gap: 2 }}
        >
          <Box
            component={Link}
            href={APP_CONFIG.routes.home}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              color: "inherit",
              textDecoration: "none",
            }}
          >
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
              {APP_CONFIG.app.title}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              component={Link}
              href={APP_CONFIG.routes.home}
              color="inherit"
              sx={{ color: "text.primary" }}
            >
              Home
            </Button>
            <Button
              component={Link}
              href={APP_CONFIG.routes.search}
              color="inherit"
              sx={{ color: "primary.main", fontWeight: 700 }}
            >
              Search
            </Button>
            {user ? (
              <UserAccountMenu label={user.name || user.email || "Signed in"} />
            ) : (
              <HomeSignInButton callbackUrl={callbackUrl} />
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

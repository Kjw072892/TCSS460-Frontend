"use client";

import {
  AppBar,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import SendIcon from "@mui/icons-material/Send";
import BugReportIcon from "@mui/icons-material/BugReport";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";

import Logo from "@/components/Logo";
import SignInButton from "@/components/SignInButton";
import UserAccountMenu from "@/components/UserAccountMenu";
import { APP_CONFIG } from "@/config";
import {
  DEV_AUTH_SIMULATION_ENABLED,
  getEffectiveUser,
} from "@/lib/dev-user";

/**
 * App shell rendered by the `(dashboard)` route group: top AppBar with
 * branding, navigation icons, and auth controls. Wraps every signed-in page
 * via the App Router layout convention. Public routes (e.g. `/messages`) use
 * `PublicShell` instead.
 */
export default function DashboardShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const user = getEffectiveUser(session?.user);
  const signedIn = status === "authenticated" || DEV_AUTH_SIMULATION_ENABLED;

  return (
    <section>
      <AppBar
        position="static"
        sx={{ bgcolor: "#000000", borderBottom: "1px solid #2c2c2c" }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
            <Tooltip title="Dashboard">
              <Box
                component={Link}
                href={APP_CONFIG.routes.dashboard}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <Logo variant="full" width={35} height={35} />
                <Typography
                  variant="h6"
                  component="div"
                  sx={{ display: { xs: "none", sm: "block" } }}
                >
                  {APP_CONFIG.app.title}
                </Typography>
              </Box>
            </Tooltip>
          </Box>

          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 1,
            }}
          >
            <Tooltip title="Search">
              <IconButton
                component={Link}
                href={APP_CONFIG.routes.search}
                color="inherit"
                aria-label="Search"
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Messages">
              <IconButton
                component={Link}
                href={APP_CONFIG.routes.messagesView}
                color="inherit"
                aria-label="View Messages"
              >
                <EmailIcon />
              </IconButton>
            </Tooltip>
            {signedIn && (
              <>
                <Tooltip title="Send Message">
                  <IconButton
                    component={Link}
                    href={APP_CONFIG.routes.messagesSend}
                    color="inherit"
                    aria-label="Send Message"
                  >
                    <SendIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Profile">
                  <IconButton
                    component={Link}
                    href={APP_CONFIG.routes.profile}
                    color="inherit"
                    aria-label="Profile"
                  >
                    <PersonIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Token Debug">
                  <IconButton
                    component={Link}
                    href={APP_CONFIG.routes.debug}
                    color="inherit"
                    aria-label="Token Debug"
                  >
                    <BugReportIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Divider
              orientation="vertical"
              flexItem
              sx={{ bgcolor: "white", mx: 1 }}
            />

            {status === "loading" && (
              <CircularProgress size={20} color="inherit" />
            )}
            {status !== "loading" && signedIn && (
              <UserAccountMenu
                label={user?.name ?? user?.email ?? "Signed in"}
              />
            )}
            {status !== "loading" && !signedIn && <SignInButton />}
          </Box>
        </Toolbar>
      </AppBar>

      {children}
    </section>
  );
}

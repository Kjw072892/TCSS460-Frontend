"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Divider, ListItemText, Menu, MenuItem } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import { signOut } from "next-auth/react";
import { APP_CONFIG } from "@/config";

interface UserAccountMenuProps {
  label: string;
}

export default function UserAccountMenu({ label }: UserAccountMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        color="inherit"
        onClick={handleOpen}
        endIcon={<ArrowDropDownIcon />}
        sx={{
          color: "text.secondary",
          fontWeight: 600,
          textTransform: "none",
          px: 1.25,
          minWidth: 0,
        }}
      >
        {label}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 260,
              bgcolor: "#121212",
              color: "common.white",
              border: "1px solid",
              borderColor: "rgba(255,255,255,0.12)",
            },
          },
        }}
      >
        <MenuItem
          component={Link}
          href={APP_CONFIG.routes.profile}
          onClick={handleClose}
        >
          <PersonOutlineIcon fontSize="small" sx={{ mr: 1.5, opacity: 0.7 }} />
          <ListItemText
            primary="View profile"
            slotProps={{
              primary: { sx: { color: "rgba(255,255,255,0.85)" } },
            }}
          />
        </MenuItem>

        <MenuItem disabled onClick={handleClose}>
          <RateReviewOutlinedIcon
            fontSize="small"
            sx={{ mr: 1.5, opacity: 0.7 }}
          />
          <ListItemText
            primary="Reviews, ratings, and comments"
            secondary="Coming soon"
            slotProps={{
              primary: { sx: { color: "rgba(255,255,255,0.85)" } },
              secondary: { sx: { color: "rgba(255,255,255,0.5)" } },
            }}
          />
        </MenuItem>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

        <MenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          sx={{
            color: "#ff6b6b",
            "&:hover": {
              bgcolor: "rgba(255,107,107,0.12)",
            },
          }}
        >
          <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}

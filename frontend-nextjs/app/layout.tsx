"use client";

import React from "react";
import Link from "next/link";
import { AppBar, Toolbar, Typography, Button, Container } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import SendIcon from "@mui/icons-material/Send";
import ContactsIcon from "@mui/icons-material/Contacts";
import HistoryIcon from "@mui/icons-material/History";
import FolderIcon from "@mui/icons-material/Folder";
import theme from "./theme";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Email Sender
              </Typography>
              <Button
                color="inherit"
                component={Link}
                href="/"
                startIcon={<SendIcon />}
              >
                Send Emails
              </Button>
              <Button
                color="inherit"
                component={Link}
                href="/files"
                startIcon={<FolderIcon />}
              >
                Files
              </Button>
              <Button
                color="inherit"
                component={Link}
                href="/address-book"
                startIcon={<ContactsIcon />}
              >
                Address Book
              </Button>
              <Button
                color="inherit"
                component={Link}
                href="/history"
                startIcon={<HistoryIcon />}
              >
                History
              </Button>
            </Toolbar>
          </AppBar>
          <Container>{children}</Container>
        </ThemeProvider>
      </body>
    </html>
  );
}

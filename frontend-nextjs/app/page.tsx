"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FileUpload from "./components/FileUpload";
import EmailForm from "./components/EmailForm";
import StatusDisplay from "./components/StatusDisplay";
import axios from "axios";
import { BACKEND_URL } from "./api/config";

interface UploadedFile {
  name: string;
  path: string;
}

interface EmailFormData {
  subject: string;
  body: string;
}

interface StatusItem {
  email: string;
  name: string;
  status: "success" | "error" | "sending" | "skipped" | "pending";
  message: string;
}

interface Recipient {
  id: number;
  name: string;
  email: string;
  status: string;
}

interface ConfirmDialogState {
  open: boolean;
  emailData: EmailFormData | null;
  fileFilter: string | null;
  files: UploadedFile[];
  currentRecipient: Recipient | null;
  remainingRecipients: Recipient[];
  skipConfirmation: boolean;
}

/**
 * Checks if a filename matches a given pattern
 * @param filename - The filename to check
 * @param pattern - The pattern to match against
 * @returns True if the filename matches the pattern
 */
const applyFilePattern = (filename: string, pattern: string): boolean => {
  console.log("Matching file:", filename);
  console.log("Against pattern:", pattern);

  if (!filename || !pattern) {
    console.log("Invalid input - filename or pattern is empty");
    return false;
  }

  const lowerFilename = filename.toLowerCase().trim();
  const lowerPattern = pattern.toLowerCase().trim();

  console.log("Lowercase filename:", lowerFilename);
  console.log("Lowercase pattern:", lowerPattern);

  if (lowerFilename.includes(lowerPattern)) {
    console.log("Direct match found");
    return true;
  }

  const koreanPattern = lowerPattern.split("").join("[^가-힣]*");
  console.log("Korean pattern:", koreanPattern);

  try {
    const regex = new RegExp(koreanPattern);
    const matches = regex.test(lowerFilename);
    console.log("Korean pattern match result:", matches);
    return matches;
  } catch (error) {
    console.error("Regex error:", error);
    return lowerFilename.includes(lowerPattern);
  }
};

/**
 * Sends emails to multiple recipients
 */
const sendEmailsToRecipients = async (
  recipients: Recipient[],
  emailData: EmailFormData,
  fileFilter: string,
  uploadedFiles: UploadedFile[],
  setStatus: React.Dispatch<React.SetStateAction<StatusItem[]>>
) => {
  const recipientsWithFiles = recipients.map((recipient) => {
    const matchingFiles =
      fileFilter === "all-recipients"
        ? uploadedFiles
        : uploadedFiles.filter((file) => applyFilePattern(file.name, recipient.name));

    return {
      recipient,
      matchingFiles,
    };
  });

  for (const { recipient, matchingFiles } of recipientsWithFiles) {
    setStatus((prev) =>
      prev.map((s) =>
        s.email === recipient.email
          ? { ...s, status: "sending" as "sending", message: "Sending..." }
          : s
      )
    );

    if (matchingFiles.length === 0) {
      setStatus((prev) =>
        prev.map((s) =>
          s.email === recipient.email
            ? { ...s, status: "skipped" as "skipped", message: "No matching files found" }
            : s
        )
      );
      continue;
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/send-email`, {
        receiver_email: recipient.email,
        recipient_name: recipient.name,
        subject: emailData.subject,
        body: emailData.body,
        files: matchingFiles,
      });

      setStatus((prev) =>
        prev.map((s) =>
          s.email === recipient.email
            ? {
                ...s,
                status: (response.data.success ? "success" : "error") as "success" | "error",
                message: response.data.message,
              }
            : s
        )
      );
    } catch (error: unknown) {
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
          ? error.message
          : "Failed to send email";

      setStatus((prev) =>
        prev.map((s) =>
          s.email === recipient.email
            ? {
                ...s,
                status: "error" as "error",
                message: errorMessage,
              }
            : s
        )
      );
    }
  }
};

export default function EmailSenderPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [status, setStatus] = useState<StatusItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    emailData: null,
    fileFilter: null,
    files: [],
    currentRecipient: null,
    remainingRecipients: [],
    skipConfirmation: false,
  });

  useEffect(() => {
    const reloadFiles = localStorage.getItem("reloadFiles");
    if (reloadFiles) {
      try {
        const filesToLoad = JSON.parse(reloadFiles);
        if (filesToLoad && filesToLoad.length > 0) {
          const formattedFiles = filesToLoad.map((file: UploadedFile) => ({
            name: decodeURIComponent(file.name),
            path: file.path,
          }));

          setUploadedFiles(formattedFiles);
          setStatus([]);
          setError(null);
          localStorage.removeItem("reloadFiles");
        }
      } catch (error) {
        console.error("Error loading files from storage:", error);
      }
    }
  }, []);

  const handleFilesUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    setError(null);
    setStatus([]);
  };

  const handleReset = () => {
    if (!sending) {
      setOpenResetDialog(true);
    }
  };

  const confirmReset = () => {
    setUploadedFiles([]);
    setStatus([]);
    setError(null);
    setOpenResetDialog(false);
  };

  const showConfirmation = async (
    emailData: EmailFormData,
    fileFilter: string,
    recipients: Recipient[] | null = null
  ) => {
    try {
      let remainingRecipients = recipients;
      if (!remainingRecipients) {
        const response = await axios.get<Recipient[]>(`${BACKEND_URL}/active-addresses`);
        remainingRecipients = response.data;

        setStatus(
          remainingRecipients.map((recipient) => ({
            email: recipient.email,
            name: recipient.name,
            status: "pending" as "pending",
            message: "Waiting to send...",
          }))
        );
      }

      let currentRecipient: Recipient | null = null;
      let currentFiles: UploadedFile[] = [];
      let newRemainingRecipients = [...remainingRecipients];

      while (newRemainingRecipients.length > 0 && !currentRecipient) {
        const nextRecipient = newRemainingRecipients[0];
        const matchingFiles =
          fileFilter === "all-recipients"
            ? uploadedFiles
            : uploadedFiles.filter((file) => applyFilePattern(file.name, nextRecipient.name));

        if (matchingFiles.length > 0) {
          currentRecipient = nextRecipient;
          currentFiles = matchingFiles;
        } else {
          setStatus((prev) =>
            prev.map((s) =>
              s.email === nextRecipient.email
                ? { ...s, status: "skipped" as "skipped", message: "No matching files found" }
                : s
            )
          );
        }
        newRemainingRecipients = newRemainingRecipients.slice(1);
      }

      if (!currentRecipient) {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        setSending(false);
        return;
      }

      setConfirmDialog({
        open: true,
        emailData,
        fileFilter,
        files: currentFiles,
        currentRecipient,
        remainingRecipients: newRemainingRecipients,
        skipConfirmation: false,
      });
    } catch (error) {
      setError("Failed to fetch recipients for confirmation");
      setSending(false);
    }
  };

  const handleEmailSubmit = async (emailData: EmailFormData, fileFilter: string) => {
    if (!confirmDialog.skipConfirmation) {
      await showConfirmation(emailData, fileFilter);
      return;
    }

    setError(null);

    if (uploadedFiles.length === 0) {
      setError("Please upload at least one file");
      return;
    }

    try {
      setSending(true);
      await sendEmailsToRecipients(
        status.map((s) => ({ id: 0, name: s.name, email: s.email, status: "active" })),
        emailData,
        fileFilter,
        uploadedFiles,
        setStatus
      );
    } catch (error: unknown) {
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to send emails";
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleConfirmation = async (action: string) => {
    if (action === "cancel-all") {
      setConfirmDialog((prev) => ({ ...prev, open: false }));
      setSending(false);
      return;
    }

    if (action === "skip") {
      setStatus((prev) =>
        prev.map((s) =>
          s.email === confirmDialog.currentRecipient?.email
            ? { ...s, status: "skipped" as "skipped", message: "Skipped by user" }
            : s
        )
      );

      await showConfirmation(
        confirmDialog.emailData!,
        confirmDialog.fileFilter!,
        confirmDialog.remainingRecipients
      );
      return;
    }

    const skipFutureConfirmations = action === "confirmAll";
    const currentRecipient = confirmDialog.currentRecipient;

    if (!currentRecipient) return;

    try {
      setSending(true);

      if (skipFutureConfirmations) {
        const allRecipients = [currentRecipient, ...confirmDialog.remainingRecipients];
        await sendEmailsToRecipients(
          allRecipients,
          confirmDialog.emailData!,
          confirmDialog.fileFilter!,
          uploadedFiles,
          setStatus
        );
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      } else {
        await sendEmailsToRecipients(
          [currentRecipient],
          confirmDialog.emailData!,
          confirmDialog.fileFilter!,
          uploadedFiles,
          setStatus
        );
        await showConfirmation(
          confirmDialog.emailData!,
          confirmDialog.fileFilter!,
          confirmDialog.remainingRecipients
        );
      }
    } catch (error) {
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    } finally {
      if (confirmDialog.remainingRecipients.length === 0 || skipFutureConfirmations) {
        setSending(false);
      }
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" component="h1">
            Send Emails
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            disabled={uploadedFiles.length === 0 && status.length === 0}
          >
            Reset
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FileUpload onFilesUpload={handleFilesUpload} files={uploadedFiles} />
        <EmailForm onSubmit={handleEmailSubmit} disabled={uploadedFiles.length === 0} />
        <StatusDisplay status={status} />

        {/* Email Confirmation Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={() => handleConfirmation("cancel-all")}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            Send Email to {confirmDialog.currentRecipient?.name}
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Recipient
              </Typography>
              <Typography>
                {confirmDialog.currentRecipient?.name} ({confirmDialog.currentRecipient?.email})
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Subject
              </Typography>
              <Typography>{confirmDialog.emailData?.subject}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Attachments ({confirmDialog.files.length})
              </Typography>
              <List dense disablePadding>
                {confirmDialog.files.map((file, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemText
                      primary={file.name}
                      primaryTypographyProps={{
                        variant: "body2",
                        sx: { wordBreak: "break-all" },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            {confirmDialog.remainingRecipients.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 2,
                  textAlign: "right",
                }}
              >
                {confirmDialog.remainingRecipients.length} more recipient
                {confirmDialog.remainingRecipients.length > 1 ? "s" : ""} remaining
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => handleConfirmation("cancel-all")} color="inherit" size="small">
              Cancel All
            </Button>
            <Button onClick={() => handleConfirmation("skip")} color="inherit" size="small">
              Skip
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => handleConfirmation("confirm")} color="primary" size="small">
              Send
            </Button>
            {confirmDialog.remainingRecipients.length > 0 && (
              <Button
                onClick={() => handleConfirmation("confirmAll")}
                color="primary"
                variant="contained"
                size="small"
              >
                Send to All
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Reset Confirmation Dialog */}
        <Dialog open={openResetDialog} onClose={() => setOpenResetDialog(false)}>
          <DialogTitle>Confirm Reset</DialogTitle>
          <DialogContent>
            Are you sure you want to reset? This will clear all uploaded files and status messages.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenResetDialog(false)}>Cancel</Button>
            <Button onClick={confirmReset} color="primary" variant="contained">
              Reset
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

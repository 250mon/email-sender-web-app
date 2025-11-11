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
import FileUpload from "../components/FileUpload";
import EmailForm from "../components/EmailForm";
import StatusDisplay from "../components/StatusDisplay";
import axios from "axios";
import { BACKEND_URL } from "../api/config";

/**
 * Checks if a filename matches a given pattern
 * @param {string} filename - The filename to check
 * @param {string} pattern - The pattern to match against
 * @returns {boolean} - True if the filename matches the pattern
 */
const applyFilePattern = (filename, pattern) => {
  console.log("Matching file:", filename);
  console.log("Against pattern:", pattern);

  if (!filename || !pattern) {
    console.log("Invalid input - filename or pattern is empty");
    return false;
  }

  // Convert both filename and pattern to lowercase for case-insensitive matching
  filename = filename.toLowerCase().trim();
  pattern = pattern.toLowerCase().trim();

  console.log("Lowercase filename:", filename);
  console.log("Lowercase pattern:", pattern);

  // Simple substring match first
  if (filename.includes(pattern)) {
    console.log("Direct match found");
    return true;
  }

  // Handle Korean names by splitting into individual characters
  const koreanPattern = pattern.split("").join("[^가-힣]*");
  console.log("Korean pattern:", koreanPattern);

  try {
    const regex = new RegExp(koreanPattern);
    const matches = regex.test(filename);
    console.log("Korean pattern match result:", matches);
    return matches;
  } catch (error) {
    console.error("Regex error:", error);
    // Fallback to simple includes check
    return filename.includes(pattern);
  }
};

/**
 * Sends emails to multiple recipients
 * @param {Array} recipients - Array of recipient objects
 * @param {Object} emailData - The email data (subject, body)
 * @param {string} fileFilter - The file filter type
 * @param {Array} uploadedFiles - All uploaded files
 * @param {Function} setStatus - Function to update status
 * @returns {Promise<void>}
 */
const sendEmailsToRecipients = async (recipients, emailData, fileFilter, uploadedFiles, setStatus) => {
    // Group recipients by their matching files
    const recipientsWithFiles = recipients.map(recipient => {
        const matchingFiles = fileFilter === "all-recipients" 
            ? uploadedFiles 
            : uploadedFiles.filter(file => applyFilePattern(file.name, recipient.name));

        return {
            recipient,
            matchingFiles
        };
    });

    // Send emails to each recipient
    for (const { recipient, matchingFiles } of recipientsWithFiles) {
        // Update status to sending
        setStatus(prev => prev.map(s => 
            s.email === recipient.email 
                ? { ...s, status: "sending", message: "Sending..." }
                : s
        ));

        if (matchingFiles.length === 0) {
            setStatus(prev => prev.map(s => 
                s.email === recipient.email 
                    ? { ...s, status: "skipped", message: "No matching files found" }
                    : s
            ));
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

            setStatus(prev => prev.map(s => 
                s.email === recipient.email 
                    ? { 
                        ...s, 
                        status: response.data.success ? "success" : "error",
                        message: response.data.message
                    }
                    : s
            ));
        } catch (error) {
            setStatus(prev => prev.map(s => 
                s.email === recipient.email 
                    ? { 
                        ...s, 
                        status: "error",
                        message: error.response?.data?.message || error.message || "Failed to send email"
                    }
                    : s
            ));
        }
    }
};

/**
 * EmailSenderPage component handles the email sending functionality including file uploads,
 * email composition, and status tracking for multiple recipients.
 * @return {JSX.Element} The rendered email sender page
 */
function EmailSenderPage() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [status, setStatus] = useState([]);
  const [error, setError] = useState(null);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [sending, setSending] = useState(false); // New state for tracking send status
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    emailData: null,
    fileFilter: null,
    files: [],
    currentRecipient: null,
    remainingRecipients: [],
    skipConfirmation: false,
  });

  useEffect(() => {
    const reloadFiles = localStorage.getItem('reloadFiles');
    if (reloadFiles) {
      try {
        const filesToLoad = JSON.parse(reloadFiles);
        if (filesToLoad && filesToLoad.length > 0) {
          // Convert file objects to format expected by FileUpload component
          const formattedFiles = filesToLoad.map(file => ({
            name: decodeURIComponent(file.name), // Ensure proper Unicode decoding
            path: file.path,
            size: file.size,
          }));
          
          setUploadedFiles(formattedFiles);
          setStatus([]);
          setError(null);
          
          // Clear localStorage after loading
          localStorage.removeItem('reloadFiles');
        }
      } catch (error) {
        console.error('Error loading files from storage:', error);
      }
    }
  }, []);

  /**
   * Handles the file upload event
   * @param {File[]} files - Array of uploaded files
   */
  const handleFilesUpload = (files) => {
    setUploadedFiles(files);
    setError(null);
    setStatus([]);
  };

  /**
   * Triggers the reset confirmation dialog
   */
  const handleReset = () => {
    if (!sending) {
      // Prevent reset while sending
      setOpenResetDialog(true);
    }
  };

  /**
   * Confirms the reset action and clears all state
   */
  const confirmReset = () => {
    setUploadedFiles([]);
    setStatus([]);
    setError(null);
    setOpenResetDialog(false);
  };

  /**
   * Shows confirmation dialog for the next recipient with matching files
   * @param {Object} emailData - The email data object
   * @param {string} fileFilter - The file filter type
   * @param {Array} [recipients] - Optional recipients array for initial call
   */
  const showConfirmation = async (emailData, fileFilter, recipients = null) => {
    try {
      // Fetch recipients only on initial call
      let remainingRecipients = recipients;
      if (!remainingRecipients) {
        const response = await axios.get(`${BACKEND_URL}/active-addresses`);
        remainingRecipients = response.data;

        // Initialize status for all recipients
        setStatus(
          remainingRecipients.map((recipient) => ({
            email: recipient.email,
            name: recipient.name,
            status: "pending",
            message: "Waiting to send...",
          }))
        );
      }

      // Find next recipient with matching files
      let currentRecipient = null;
      let currentFiles = [];
      let newRemainingRecipients = [...remainingRecipients];

      while (newRemainingRecipients.length > 0 && !currentRecipient) {
        const nextRecipient = newRemainingRecipients[0];
        const matchingFiles = fileFilter === "all-recipients" 
          ? uploadedFiles 
          : uploadedFiles.filter(file => applyFilePattern(file.name, nextRecipient.name));

        if (matchingFiles.length > 0) {
          currentRecipient = nextRecipient;
          currentFiles = matchingFiles;
        } else {
          // Update status for skipped recipient
          setStatus(prev => prev.map(s => 
            s.email === nextRecipient.email 
              ? { ...s, status: "skipped", message: "No matching files found" }
              : s
          ));
        }
        newRemainingRecipients = newRemainingRecipients.slice(1);
      }

      if (!currentRecipient) {
        // No more recipients with matching files
        setConfirmDialog(prev => ({ ...prev, open: false }));
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
        skipConfirmation: false
      });
    } catch (error) {
      setError("Failed to fetch recipients for confirmation");
      setSending(false);
    }
  };

  /**
   * Handles the email form submission
   */
  const handleEmailSubmit = async (emailData, fileFilter) => {
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
      await sendEmailsToRecipients(status, emailData, fileFilter, uploadedFiles, setStatus);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  /**
   * Handles confirmation dialog actions
   */
  const handleConfirmation = async (action) => {
    if (action === "cancel-all") {
      setConfirmDialog(prev => ({ ...prev, open: false }));
      setSending(false);
      return;
    }

    if (action === "skip") {
      // Update status for skipped recipient
      setStatus(prev => prev.map(s => 
        s.email === confirmDialog.currentRecipient.email 
          ? { ...s, status: "skipped", message: "Skipped by user" }
          : s
      ));

      // Show confirmation for next recipient
      await showConfirmation(
        confirmDialog.emailData,
        confirmDialog.fileFilter,
        confirmDialog.remainingRecipients
      );
      return;
    }

    const skipFutureConfirmations = action === "confirmAll";
    const currentRecipient = confirmDialog.currentRecipient;

    try {
      setSending(true);
      
      if (skipFutureConfirmations) {
        // Send to all recipients at once
        const allRecipients = [currentRecipient, ...confirmDialog.remainingRecipients];
        await sendEmailsToRecipients(
          allRecipients,
          confirmDialog.emailData,
          confirmDialog.fileFilter,
          uploadedFiles,
          setStatus
        );
        setConfirmDialog(prev => ({ ...prev, open: false }));
      } else {
        // Send to current recipient only
        await sendEmailsToRecipients(
          [currentRecipient],
          confirmDialog.emailData,
          confirmDialog.fileFilter,
          uploadedFiles,
          setStatus
        );
        // Show confirmation for next recipient
        await showConfirmation(
          confirmDialog.emailData,
          confirmDialog.fileFilter,
          confirmDialog.remainingRecipients
        );
      }
    } catch (error) {
      setConfirmDialog(prev => ({ ...prev, open: false }));
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
        <EmailForm
          onSubmit={handleEmailSubmit}
          disabled={uploadedFiles.length === 0}
        />
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
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Recipient
              </Typography>
              <Typography>
                {confirmDialog.currentRecipient?.name} (
                {confirmDialog.currentRecipient?.email})
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Subject
              </Typography>
              <Typography>{confirmDialog.emailData?.subject}</Typography>
            </Box>

            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
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
                {confirmDialog.remainingRecipients.length > 1 ? "s" : ""}{" "}
                remaining
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => handleConfirmation("cancel-all")}
              color="inherit"
              size="small"
            >
              Cancel All
            </Button>
            <Button
              onClick={() => handleConfirmation("skip")}
              color="inherit"
              size="small"
            >
              Skip
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              onClick={() => handleConfirmation("confirm")}
              color="primary"
              size="small"
            >
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
        <Dialog
          open={openResetDialog}
          onClose={() => setOpenResetDialog(false)}
        >
          <DialogTitle>Confirm Reset</DialogTitle>
          <DialogContent>
            Are you sure you want to reset? This will clear all uploaded files
            and status messages.
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

export default EmailSenderPage;


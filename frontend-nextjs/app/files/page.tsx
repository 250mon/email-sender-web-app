"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import { BACKEND_URL } from "../api/config";

interface FileInfo {
  name: string;
  path: string;
  size: number;
  created: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

function bytesToSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
  return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
}

export default function FilesManagerPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });
  const router = useRouter();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await axios.get<{ files: FileInfo[] }>(`${BACKEND_URL}/files`);
      setFiles(response.data.files || []);
    } catch (error) {
      showSnackbar("Failed to load files", "error");
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error" = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedFiles(files.map((file) => file.path));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleSelectFile = (path: string) => {
    const newSelected = [...selectedFiles];
    const index = newSelected.indexOf(path);
    if (index === -1) {
      newSelected.push(path);
    } else {
      newSelected.splice(index, 1);
    }
    setSelectedFiles(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;

    setLoading(true);
    try {
      await axios.delete(`${BACKEND_URL}/files`, {
        data: selectedFiles,
      });
      showSnackbar(`${selectedFiles.length} files deleted successfully`);
      setSelectedFiles([]);
      loadFiles();
    } catch (error) {
      showSnackbar("Failed to delete files", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (files.length === 0) return;

    if (!window.confirm("Are you sure you want to delete all files?")) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${BACKEND_URL}/files`);
      showSnackbar("All files deleted successfully");
      setSelectedFiles([]);
      loadFiles();
    } catch (error) {
      showSnackbar("Failed to delete files", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToEmailSender = () => {
    const filesToSend =
      selectedFiles.length > 0 ? files.filter((file) => selectedFiles.includes(file.path)) : files;

    localStorage.setItem("reloadFiles", JSON.stringify(filesToSend));
    router.push("/");
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
            Manage Files
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadFiles}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleSendToEmailSender}
              disabled={files.length === 0}
            >
              {selectedFiles.length > 0 ? "Send Selected" : "Send All"} to Email Sender
            </Button>
          </Box>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Checkbox
                indeterminate={selectedFiles.length > 0 && selectedFiles.length < files.length}
                checked={files.length > 0 && selectedFiles.length === files.length}
                onChange={handleSelectAll}
                disabled={files.length === 0}
              />
              <Typography>
                {selectedFiles.length} of {files.length} selected
              </Typography>
            </Box>
            <Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteSelected}
                disabled={selectedFiles.length === 0}
                sx={{ mr: 1 }}
              >
                Delete Selected
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteAll}
                disabled={files.length === 0}
              >
                Delete All
              </Button>
            </Box>
          </Box>
          <Divider />
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 4,
              }}
            >
              <CircularProgress />
            </Box>
          ) : files.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">No files available</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {files.map((file, index) => (
                <React.Fragment key={file.path}>
                  {index > 0 && <Divider />}
                  <ListItem dense>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedFiles.includes(file.path)}
                        onChange={() => handleSelectFile(file.path)}
                      />
                    </ListItemIcon>
                    <ListItemIcon>
                      <UploadFileIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Tooltip title={file.name}>
                          <Typography noWrap sx={{ maxWidth: 400, wordBreak: "break-all" }}>
                            {file.name}
                          </Typography>
                        </Tooltip>
                      }
                      secondary={`${bytesToSize(file.size)} • ${new Date(
                        file.created
                      ).toLocaleString()}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => {
                          setSelectedFiles([file.path]);
                          handleDeleteSelected();
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

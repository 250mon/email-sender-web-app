"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import axios from "axios";
import { BACKEND_URL } from "../api/config";

interface UploadedFile {
  name: string;
  path: string;
}

interface FileUploadProps {
  onFilesUpload: (files: UploadedFile[]) => void;
  files: UploadedFile[];
}

/**
 * FileUpload component handles file uploads via drag-and-drop or file selection
 * @param props - Component props
 * @param props.onFilesUpload - Callback function when files are uploaded
 * @param props.files - Array of currently uploaded files
 * @returns Rendered file upload component
 */
const FileUpload = ({ onFilesUpload, files = [] }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);

  /**
   * Handles file drop events
   * @param e - Drop event
   */
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  };

  /**
   * Handles file input selection
   * @param e - Change event
   */
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  /**
   * Processes and uploads files
   * @param fileList - List of files to upload
   */
  const handleFiles = async (fileList: FileList) => {
    setUploading(true);
    const formData = new FormData();

    for (let i = 0; i < fileList.length; i++) {
      formData.append("files", fileList[i]);
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      onFilesUpload(response.data.files);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Removes a file from the list
   * @param index - Index of file to remove
   */
  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesUpload(newFiles);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper
        sx={{
          p: 2,
          border: "2px dashed #ccc",
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: "#fafafa",
        }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          style={{ display: "none" }}
          id="file-input"
        />
        <label htmlFor="file-input">
          <Button
            component="span"
            startIcon={<CloudUploadIcon />}
            variant="contained"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Files"}
          </Button>
        </label>
        <Typography variant="body2" sx={{ mt: 1 }}>
          or drag and drop files here
        </Typography>
      </Paper>

      {files.length > 0 && (
        <List>
          {files.map((file, index) => (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton edge="end" onClick={() => removeFile(index)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={file.name} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FileUpload;

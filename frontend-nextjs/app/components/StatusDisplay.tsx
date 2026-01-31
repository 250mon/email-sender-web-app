"use client";

import React from "react";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SendIcon from "@mui/icons-material/Send";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import PendingIcon from "@mui/icons-material/Pending";

type StatusType = "success" | "error" | "sending" | "skipped" | "pending";

interface StatusItem {
  status: StatusType;
  email: string;
  name: string;
  message: string;
}

interface StatusDisplayProps {
  status: StatusItem[];
}

/**
 * StatusDisplay component shows the current status of email sending operations
 * @param props - Component props
 * @param props.status - Array of status objects
 * @returns Rendered status display
 */
const StatusDisplay = ({ status }: StatusDisplayProps) => {
  if (status.length === 0) return null;

  const getStatusColor = (statusType: StatusType): "success" | "error" | "info" | "warning" => {
    switch (statusType) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "sending":
        return "info";
      case "skipped":
        return "warning";
      default:
        return "info";
    }
  };

  const getStatusIcon = (statusType: StatusType) => {
    switch (statusType) {
      case "success":
        return <CheckCircleIcon />;
      case "error":
        return <ErrorIcon />;
      case "sending":
        return <SendIcon />;
      case "skipped":
        return <SkipNextIcon />;
      default:
        return <PendingIcon />;
    }
  };

  return (
    <Paper sx={{ mt: 2, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Send Status
      </Typography>
      <List>
        {status.map((item, index) => (
          <ListItem key={index}>
            <ListItemIcon>{getStatusIcon(item.status)}</ListItemIcon>
            <ListItemText
              primary={`${item.name} (${item.email})`}
              secondary={item.message}
              sx={{
                "& .MuiListItemText-primary": {
                  color: (theme) =>
                    theme.palette[getStatusColor(item.status)]?.main,
                },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default StatusDisplay;

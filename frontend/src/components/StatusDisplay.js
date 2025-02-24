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

/**
 * StatusDisplay component shows the current status of email sending operations
 * @param {Object} props - Component props
 * @param {Array<{status: string, email: string, message: string}>} props.status - Array of status objects
 * @returns {JSX.Element} Rendered status display
 */
const StatusDisplay = ({ status }) => {
  if (status.length === 0) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "sending":
        return "info";
      case "skipped":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
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

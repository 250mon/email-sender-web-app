import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import dayjs from "dayjs";
import { BACKEND_URL } from "../api/config";

function EmailHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [filters, setFilters] = useState({
    recipient: "",
    subject: "",
    status: "",
    dateFrom: null,
    dateTo: null,
  });

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${BACKEND_URL}/api/email-history`;
      const params = new URLSearchParams();

      if (filters.recipient) params.append("recipient", filters.recipient);
      if (filters.subject) params.append("subject", filters.subject);
      if (filters.status) params.append("status", filters.status);
      if (filters.dateFrom)
        params.append("date_from", filters.dateFrom.format("YYYY-MM-DD"));
      if (filters.dateTo)
        params.append("date_to", filters.dateTo.format("YYYY-MM-DD"));

      const response = await axios.get(`${url}?${params.toString()}`);
      setHistory(response.data);
    } catch (error) {
      setError("Failed to load email history");
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      loadHistory();
    }
  };

  const getStatusChip = (status) => {
    const statusProps = {
      success: { color: "success", label: "Success" },
      error: { color: "error", label: "Failed" },
    }[status] || { color: "default", label: status };

    return <Chip size="small" {...statusProps} />;
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).format("YYYY-MM-DD HH:mm:ss");
  };

  return (
    <Container maxWidth="lg">
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
            Email History
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={loadHistory} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              label="Search Recipient"
              size="small"
              value={filters.recipient}
              onChange={(e) => handleFilterChange("recipient", e.target.value)}
              onKeyPress={handleKeyPress}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="Search Subject"
              size="small"
              value={filters.subject}
              onChange={(e) => handleFilterChange("subject", e.target.value)}
              onKeyPress={handleKeyPress}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="error">Failed</MenuItem>
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="From Date"
                value={filters.dateFrom}
                onChange={(date) => handleFilterChange("dateFrom", date)}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: { width: 200 },
                  },
                }}
              />
              <DatePicker
                label="To Date"
                value={filters.dateTo}
                onChange={(date) => handleFilterChange("dateTo", date)}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: { width: 200 },
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Files</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.created_at)}</TableCell>
                    <TableCell>
                      {record.recipient_name}
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        {record.recipient_email}
                      </Typography>
                    </TableCell>
                    <TableCell>{record.subject}</TableCell>
                    <TableCell>{JSON.parse(record.files).join(", ")}</TableCell>
                    <TableCell>{getStatusChip(record.status)}</TableCell>
                    <TableCell>{record.message}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={history.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </TableContainer>
      </Box>
    </Container>
  );
}

export default EmailHistoryPage;


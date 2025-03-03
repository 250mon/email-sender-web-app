import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Alert,
  Snackbar,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from '@mui/icons-material/FilterList';
import axios from "axios";
import { BACKEND_URL } from "../api/config";

const AddressBookPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "active",
  });
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const loadAddresses = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/addresses`, {
        params: {
          status: showActiveOnly ? 'active' : undefined
        }
      });
      setAddresses(response.data);
    } catch (error) {
      console.error('Failed to load addresses:', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: `${BACKEND_URL}/api/addresses`,
        params: { status: showActiveOnly ? 'active' : undefined },
        stack: error.stack
      });
      if (error.message === 'Network Error') {
        showSnackbar("Failed to load resource: Could not connect to the server.", "error");
      } else {
        showSnackbar("Error loading addresses", "error");
      }
    }
  }, [showActiveOnly]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenDialog = (address = null) => {
    if (address) {
      setFormData(address);
      setEditingAddress(address);
    } else {
      setFormData({ name: "", email: "", status: "active" });
      setEditingAddress(null);
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAddress(null);
    setFormData({ name: "", email: "", status: "active" });
    setErrors({});
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (editingAddress) {
        await axios.put(`${BACKEND_URL}/api/addresses/${editingAddress.id}`, {
          ...formData,
        });
        setEditingAddress(null);
        showSnackbar("Address updated successfully");
      } else {
        await axios.post(`${BACKEND_URL}/api/addresses`, formData);
        showSnackbar("Address added successfully");
      }
      loadAddresses();
      handleCloseDialog();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Error saving address",
        "error",
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      try {
        await axios.delete(`${BACKEND_URL}/api/addresses/${id}`);
        showSnackbar("Address deleted successfully");
        loadAddresses();
      } catch (error) {
        showSnackbar("Error deleting address", "error");
      }
    }
  };

  const handleToggleFilter = () => {
    setShowActiveOnly(!showActiveOnly);
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
          <Typography variant="h4">Address Book</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={handleToggleFilter}
              sx={{ height: 'fit-content' }}
            >
              {showActiveOnly ? "Show All" : "Show Active Only"}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add New Address
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {addresses.map((address) => (
                <TableRow key={address.id}>
                  <TableCell>{address.name}</TableCell>
                  <TableCell>{address.email}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        textTransform: 'capitalize',
                        color: address.status === 'active' ? 'success.main' : 'text.secondary',
                        fontSize: 'inherit',
                      }}
                    >
                      {address.status}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenDialog(address)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(address.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>
            {editingAddress ? "Edit Address" : "Add New Address"}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              error={!!errors.name}
              helperText={errors.name}
            />
            <TextField
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={!!errors.email}
              helperText={errors.email}
            />
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Status
              </Typography>
              <RadioGroup
                row
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <FormControlLabel 
                  value="active" 
                  control={<Radio />} 
                  label="Active" 
                />
                <FormControlLabel 
                  value="inactive" 
                  control={<Radio />} 
                  label="Inactive" 
                />
              </RadioGroup>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingAddress ? "Save" : "Add"}
            </Button>
          </DialogActions>
        </Dialog>

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
      </Box>
    </Container>
  );
};

export default AddressBookPage;

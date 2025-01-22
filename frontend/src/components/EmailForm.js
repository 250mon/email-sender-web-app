import React, { useState } from 'react';
import { 
    Box, 
    TextField, 
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

/**
 * EmailForm component for composing and sending emails
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {boolean} props.disabled - Whether the form is disabled
 * @returns {JSX.Element} The rendered email form
 */
function EmailForm({ onSubmit, disabled }) {
    const [formData, setFormData] = useState({
        subject: '',
        body: ''
    });
    const [fileFilter, setFileFilter] = useState('recipient-name');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData, fileFilter);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box component="form" onSubmit={handleSubmit}>
                <TextField
                    fullWidth
                    label="Subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    margin="normal"
                    required
                    disabled={disabled}
                />
                
                <TextField
                    fullWidth
                    label="Message"
                    name="body"
                    value={formData.body}
                    onChange={handleChange}
                    margin="normal"
                    required
                    multiline
                    rows={4}
                    disabled={disabled}
                />

                <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    alignItems: 'center',
                    mt: 2 
                }}>
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel id="file-filter-label">File Filter</InputLabel>
                        <Select
                            labelId="file-filter-label"
                            value={fileFilter}
                            label="File Filter"
                            onChange={(e) => setFileFilter(e.target.value)}
                            disabled={disabled}
                        >
                            <MenuItem value="all-recipients">Send to All Recipients</MenuItem>
                            <MenuItem value="recipient-name">Match Recipient Name</MenuItem>
                        </Select>
                    </FormControl>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={disabled || !formData.subject || !formData.body}
                        endIcon={<SendIcon />}
                        sx={{ ml: 'auto' }}
                    >
                        Send
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default EmailForm;

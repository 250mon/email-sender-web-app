import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import EmailSenderPage from './pages/EmailSenderPage';
import AddressBookPage from './pages/AddressBookPage';
import EmailHistoryPage from './pages/EmailHistoryPage';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import ContactsIcon from '@mui/icons-material/Contacts';

function App() {
    return (
        <Router>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Email Sender
                    </Typography>
                    <Button 
                        color="inherit" 
                        component={Link} 
                        to="/"
                        startIcon={<SendIcon />}
                    >
                        Send Emails
                    </Button>
                    <Button 
                        color="inherit" 
                        component={Link} 
                        to="/address-book"
                        startIcon={<ContactsIcon />}
                    >
                        Address Book
                    </Button>
                    <Button 
                        color="inherit" 
                        component={Link} 
                        to="/history"
                        startIcon={<HistoryIcon />}
                    >
                        History
                    </Button>
                </Toolbar>
            </AppBar>

            <Container>
                <Routes>
                    <Route path="/" element={<EmailSenderPage />} />
                    <Route path="/address-book" element={<AddressBookPage />} />
                    <Route path="/history" element={<EmailHistoryPage />} />
                </Routes>
            </Container>
        </Router>
    );
}

export default App;

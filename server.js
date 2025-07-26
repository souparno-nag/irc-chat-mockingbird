const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up session middleware
app.use(session({
    secret: 'supersecretkey', // change in production!
    resave: false,
    saveUninitialized: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Dummy user data
const users = [
    { username: 'admin', password: 'password123' },
    { username: 'player1', password: 'game123' }
];

// Routes
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/server-log.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'server-log.html'));
});

// Protect access to irc.html
app.get('/irc.html', (req, res) => {
    if (req.session && req.session.loggedIn) {
        res.sendFile(path.join(__dirname, 'public', 'irc.html'));
    } else {
        res.redirect('/login.html');
    }
});

// Handle login POST
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const validUser = users.find(u => u.username === username && u.password === password);
    if (validUser) {
        req.session.loggedIn = true;
        req.session.username = username;
        res.redirect('/irc.html');
    } else {
        res.send('Invalid credentials. <a href="/login.html">Try again</a>.');
    }
});

// Handle chat submission
app.post('/chat', (req, res) => {
    if (!req.session || !req.session.loggedIn) {
        return res.status(401).send('Unauthorized');
    }

    const { channelName, message } = req.body;
    const filePath = path.join(__dirname, 'data', 'chat.json');

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const channel = data.find(c => c['channel-name'] === channelName);
        if (channel) {
            channel['channel-contents'].push(`${req.session.username}: ${message}`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
            res.sendStatus(200);
        } else {
            res.status(404).send('Channel not found');
        }
    } catch (err) {
        console.error('Error writing chat:', err);
        res.status(500).send('Server error');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

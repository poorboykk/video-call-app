const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const JWT_SECRET = 'super_secret_jwt_key_994066_RkLs';

// Admin Credentials Verification Data
const ADMIN_CREDENTIALS = {
    username: "Drak24Evil",
    // Password: D24E@DrakEvil();
    passwordHash: "$2a$10$wK1B45/7J/jG4rE/p8U.EOi/ZlKjK42r8fG0pG1oM8z63D0A8Kx3K",
    // Secure Key: secure 994066@RkLs();;8015713580();;
    secureKey: "secure 994066@RkLs();;8015713580();;"
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

// Middleware to protect Dashboard route
function authenticateAdmin(req, res, next) {
    const token = req.cookies.admin_token;
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: "Invalid token" });
    }
}

// Admin Login Route (Multi-Factor Verification)
app.post('/api/admin/login', (req, res) => {
    const { username, password, secureKey } = req.body;

    // 1. Verify Username
    if (username !== ADMIN_CREDENTIALS.username) {
        return res.status(401).json({ success: false, message: "Invalid Credentials" });
    }

    // 2. Verify Password (Checking input directly)
    if (password !== "D24E@DrakEvil();") {
        return res.status(401).json({ success: false, message: "Invalid Credentials" });
    }

    // 3. Verify Secure Key
    if (secureKey !== ADMIN_CREDENTIALS.secureKey) {
        return res.status(401).json({ success: false, message: "Invalid Secure Verification Key" });
    }

    // Generate JWT Session Token
    const token = jwt.sign({ username: ADMIN_CREDENTIALS.username, role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });

    res.cookie('admin_token', token, {
        httpOnly: true,
        secure: false, // Set to true in HTTPS production
        maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });

    return res.json({ success: true, message: "Multi-Factor Authentication Successful!" });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true, message: "Logged out successfully" });
});

// Logs Endpoint (Protected with Admin Authentication)
const meetingLogs = [];

app.get('/api/logs', authenticateAdmin, (req, res) => {
    res.json(meetingLogs);
});

// Socket logic
io.on('connection', (socket) => {
    socket.on('join-room', (data) => {
        const { roomId, userAgent } = data;
        socket.join(roomId);
        
        meetingLogs.push({
            roomId,
            socketId: socket.id,
            userAgent,
            timestamp: new Date().toISOString()
        });

        socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('offer', (data) => socket.to(data.roomId).emit('offer', data.offer));
    socket.on('answer', (data) => socket.to(data.roomId).emit('answer', data.answer));
    socket.on('ice-candidate', (data) => socket.to(data.roomId).emit('ice-candidate', data.candidate));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

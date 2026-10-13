const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Dummy database array to store meeting logs and user agents
const meetingLogs = [];

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a specific meeting room
    socket.on('join-room', (data) => {
        const { roomId, userAgent } = data;
        socket.join(roomId);
        
        // Save to database/logs
        meetingLogs.push({
            roomId,
            socketId: socket.id,
            userAgent,
            timestamp: new Date().toISOString()
        });

        socket.to(roomId).emit('user-connected', socket.id);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', socket.id);
        });
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', data.offer);
    });

    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', data.answer);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.roomId).emit('ice-candidate', data.candidate);
    });
});

// API to fetch dashboard logs
app.get('/api/logs', (req, res) => {
    res.json(meetingLogs);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

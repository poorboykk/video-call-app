const socket = io();

const setupBox = document.getElementById('setup-box');
const videoBox = document.getElementById('video-box');
const roomIdInput = document.getElementById('roomIdInput');
const joinBtn = document.getElementById('joinBtn');
const roomTitle = document.getElementById('roomTitle');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const recordBtn = document.getElementById('recordBtn');

let localStream;
let peerConnection;
let mediaRecorder;
let recordedChunks = [];

const servers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

joinBtn.addEventListener('click', async () => {
    const roomId = roomIdInput.value.trim();
    if (!roomId) {
        alert('Please enter a valid Meeting ID');
        return;
    }

    try {
        // Request camera and microphone permissions
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        setupBox.classList.add('hidden');
        videoBox.classList.remove('hidden');
        roomTitle.innerText = `Meeting ID: ${roomId}`;

        // Send join info along with browser agent data to server
        socket.emit('join-room', {
            roomId,
            userAgent: navigator.userAgent
        });

        initWebRTC(roomId);
    } catch (error) {
        console.error('Error accessing media devices.', error);
        alert('Camera and Microphone permission is required!');
    }
});

function initWebRTC(roomId) {
    socket.on('user-connected', async (userId) => {
        createPeerConnection(roomId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { roomId, offer });
    });

    socket.on('offer', async (offer) => {
        createPeerConnection(roomId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer });
    });

    socket.on('answer', async (answer) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async (candidate) => {
        if (candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });
}

function createPeerConnection(roomId) {
    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { roomId, candidate: event.candidate });
        }
    };
}

// Video Recording functionality
recordBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.innerText = 'Start Recording';
        recordBtn.style.background = '#ef4444';
        return;
    }

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(localStream, { mimeType: 'video/webm; codecs=vp9' });

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `meeting-recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        alert('Recording saved successfully!');
    };

    mediaRecorder.start();
    recordBtn.innerText = 'Stop Recording';
    recordBtn.style.background = '#10b981';
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { startBot } = require('./bot');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Files Safely
const publicPath = fs.existsSync(path.join(__dirname, 'public')) 
    ? path.join(__dirname, 'public') 
    : path.join(process.cwd(), 'public');

app.use(express.static(publicPath));

// In-Memory App Stats Counters
let totalVisitors = 100;
const startTime = Date.now();

// API Endpoint: Log Visits & Get Visitor Count
app.get('/api/visit', (req, res) => {
    totalVisitors++;
    res.json({ visitors: totalVisitors });
});

// API Endpoint: Dashboard Performance Metrics
app.get('/api/stats', (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const uptimeMin = Math.floor(uptimeSeconds / 60);
    const uptimeHours = (uptimeMin / 60).toFixed(1);

    res.json({
        speed: '0.8s',
        uptime: uptimeMin > 60 ? `${uptimeHours}h` : `${uptimeMin}m`,
        visitors: totalVisitors
    });
});

// API Endpoint: Support & Feedback Processing
app.post('/api/support', (req, res) => {
    const { type, contact, message } = req.body;
    console.log(`💬 New Support Entry [${type}]: ${contact} - ${message}`);
    res.json({ success: true, message: 'Feedback logged successfully' });
});

// API Endpoint: Paystack Verification Mock
app.post('/api/verify-paystack', (req, res) => {
    const { reference } = req.body;
    if (reference) {
        console.log(`💳 Paystack payment verified: ${reference}`);
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Invalid reference' });
    }
});

// Primary Endpoint: HTTP POST Pairing Request
app.post('/pair', async (req, res) => {
    let { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Phone number is required' });

    // Clean non-numeric characters
    number = number.replace(/[^0-9]/g, '');

    try {
        await startBot(number, (code) => {
            if (code) {
                res.json({ code });
            } else {
                res.status(500).json({ error: 'Failed to generate code. Try again.' });
            }
        });
    } catch (err) {
        console.error('Pairing Endpoint Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// WebSocket Realtime Connection Handling
io.on('connection', (socket) => {
    socket.on('request-code', async (phone) => {
        const cleanedPhone = phone.replace(/[^0-9]/g, '');
        try {
            await startBot(cleanedPhone, (code) => {
                socket.emit('pairing-code', { code });
            });
        } catch (err) {
            console.error('Socket Pairing Error:', err.message);
            socket.emit('pairing-code', { code: null });
        }
    });
});

// Serve Main Portal
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Start Node Server
server.listen(PORT, () => {
    console.log(`🚀 Lanez Pure™ Server active on port so look sharp ${PORT}`);
});

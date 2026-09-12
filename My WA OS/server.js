const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { startBot } = require('./bot');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let activePairingCode = null;

// Persistent Visitor Stats
const VISITORS_FILE = path.join(__dirname, 'visitors.json');

function getVisitorCount() {
    try {
        if (fs.existsSync(VISITORS_FILE)) {
            const data = fs.readFileSync(VISITORS_FILE, 'utf8');
            return JSON.parse(data).count || 0;
        }
    } catch (e) {
        console.error('Error reading visitor file:', e.message);
    }
    return 0;
}

function saveVisitorCount(count) {
    try {
        fs.writeFileSync(VISITORS_FILE, JSON.stringify({ count }), 'utf8');
    } catch (e) {
        console.error('Error writing visitor file:', e.message);
    }
}

let totalVisitors = getVisitorCount();

// Track Page Visits
app.get('/api/visit', (req, res) => {
    totalVisitors++;
    saveVisitorCount(totalVisitors);
    res.json({ visitors: totalVisitors });
});

// System Stats Endpoint
app.get('/api/stats', (req, res) => {
    const totalSeconds = Math.floor(process.uptime());
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const uptimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    res.json({
        uptime: uptimeStr,
        speed: (Math.random() * 0.3 + 0.4).toFixed(2) + 's',
        visitors: totalVisitors
    });
});

// Paystack Payment Verification Endpoint
app.post('/api/verify-paystack', async (req, res) => {
    const { reference } = req.body;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "sk_test_YOUR_SECRET_KEY_HERE";

    if (!reference) return res.status(400).json({ success: false, message: 'Reference missing' });

    try {
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
        });

        if (response.data?.data?.status === 'success') {
            return res.json({ success: true, credits: 5 });
        } else {
            return res.status(400).json({ success: false, message: 'Transaction unverified' });
        }
    } catch (err) {
        console.error('Paystack verification error:', err.message);
        return res.status(500).json({ success: false, message: 'Verification failed' });
    }
});

// Support / Feedback Endpoint
app.post('/api/support', (req, res) => {
    const { type, contact, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message cannot be empty.' });

    console.log(`📩 Support Received [${type || 'General'}]: ${message} (Contact: ${contact || 'N/A'})`);
    return res.json({ success: true, message: 'Report submitted successfully.' });
});

// WhatsApp Bot Pairing Endpoint
app.post('/pair', async (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Phone number is required.' });

    console.log(`📱 Pair code requested for: ${number}`);

    const sessionPath = path.join(__dirname, 'auth_info_lanez');
    if (fs.existsSync(sessionPath)) {
        try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('🧹 Session cleared for new pair execution.');
        } catch (err) {
            console.error('Error clearing session:', err.message);
        }
    }

    activePairingCode = null;

    startBot(number, (code) => {
        activePairingCode = code;
    });

    let attempts = 0;
    while (!activePairingCode && attempts < 20) {
        await new Promise((r) => setTimeout(r, 500));
        attempts++;
    }

    if (activePairingCode) {
        return res.json({ code: activePairingCode });
    } else {
        return res.status(500).json({ error: 'Pairing timed out. Please try again.' });
    }
});

// Start WhatsApp Bot
startBot();

// Keep Alive Self-Ping for Render Hosting
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
    setInterval(async () => {
        try { await axios.get(RENDER_URL); } catch (e) {}
    }, 4 * 60 * 1000);
}

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Lanez Pure OS running on port ${PORT}`));
                                     


const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Load Commands Dynamically
const commands = new Map();
const commandsDir = path.join(__dirname, 'commands');

if (fs.existsSync(commandsDir)) {
    const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const cmdList = require(path.join(commandsDir, file));
        if (Array.isArray(cmdList)) {
            cmdList.forEach(cmd => commands.set(cmd.name, cmd));
        }
    }
}

let sock = null;
const PREFIX = '.';

async function startBot(pairingNumber = null, onCodeGenerated = null) {
    const authFolder = path.join(__dirname, 'auth_info_lanez');
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);

    // Connection Lifecycle
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`🔌 WhatsApp disconnected (${statusCode}). Reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) {
                setTimeout(() => startBot(), 3000);
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Bot Connected!');
        }
    });

    // Pair Code Generator
    if (pairingNumber && onCodeGenerated && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let cleanedNumber = pairingNumber.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(cleanedNumber);
                console.log(`🔑 Pair code generated: ${code}`);
                onCodeGenerated(code);
            } catch (err) {
                console.error('Pair code error:', err.message);
                onCodeGenerated(null);
            }
        }, 3000);
    }

    // Message Router
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg || !msg.message) return;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = isGroup ? msg.key.participant : from;

            const body = msg.message.conversation ||
                         msg.message.extendedTextMessage?.text ||
                         msg.message.imageMessage?.caption ||
                         msg.message.videoMessage?.caption || '';

            if (!body.startsWith(PREFIX)) return;

            const args = body.slice(PREFIX.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();

            const command = commands.get(cmdName);
            if (!command) return;

            const ctx = {
                sock,
                msg,
                from,
                sender,
                isGroup,
                args,
                body,
                reply: async (text) => await sock.sendMessage(from, { text }, { quoted: msg }),
                downloadMedia: async (mediaMsg, type) => {
                    const stream = await downloadContentFromMessage(mediaMsg, type);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    return buffer;
                }
            };

            await command.execute(ctx);

        } catch (err) {
            console.error('Message handler error:', err.message);
        }
    });
}

module.exports = { startBot };
      

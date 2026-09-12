module.exports = [
    {
        name: 'ok',
        description: 'Unlock View Once media',
        execute: async (ctx) => {
            const quotedMsg = ctx.msg.message.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quotedMsg) {
                return ctx.reply('⚠️ Reply directly to a View Once message with *.ok*');
            }

            const viewOncePhoto = quotedMsg.viewOnceMessageV2?.message?.imageMessage || 
                                  quotedMsg.viewOnceMessage?.message?.imageMessage;
            const viewOnceVideo = quotedMsg.viewOnceMessageV2?.message?.videoMessage || 
                                  quotedMsg.viewOnceMessage?.message?.videoMessage;

            const mediaMessage = viewOncePhoto || viewOnceVideo;
            const mediaType = viewOncePhoto ? 'image' : viewOnceVideo ? 'video' : null;

            if (!mediaType || !mediaMessage) {
                return ctx.reply('❌ Quoted message is not a View Once media file.');
            }

            const buffer = await ctx.downloadMedia(mediaMessage, mediaType);

            if (mediaType === 'image') {
                await ctx.sock.sendMessage(ctx.from, { image: buffer, caption: '🔓 *Unlocked via Lanez Pure™ OS*' });
            } else {
                await ctx.sock.sendMessage(ctx.from, { video: buffer, caption: '🔓 *Unlocked via Lanez Pure™ OS*' });
            }
        }
    }
];


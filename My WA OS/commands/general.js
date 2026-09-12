module.exports = [
    {
        name: 'ping',
        description: 'Check bot speed',
        execute: async (ctx) => {
            const start = Date.now();
            await ctx.reply('🏓 Pinging...');
            const latency = Date.now() - start;
            await ctx.reply(`⚡ Speed: *${latency}ms*`);
        }
    },
    {
        name: 'menu',
        description: 'Show Command List',
        execute: async (ctx) => {
            const text = `
🤖 *LANEZ PURE™ BOT COMMANDS*

*Media Tools:*
• \`.ok\` - Unlock View Once photos/videos
• \`.sticker\` - Convert quoted image to sticker

*Group Tools:*
• \`.tagall\` - Tag all group members
• \`.hidetag\` - Send hidden mention alert

*General:*
• \`.ping\` - Test latency
• \`.menu\` - Open this menu
`;
            await ctx.reply(text.trim());
        }
    }
];


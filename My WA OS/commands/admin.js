module.exports = [
    {
        name: 'tagall',
        description: 'Tag all group members',
        execute: async (ctx) => {
            if (!ctx.isGroup) return ctx.reply('❌ This command only works in groups.');

            const groupMetadata = await ctx.sock.groupMetadata(ctx.from);
            const participants = groupMetadata.participants;

            let text = `📢 *GROUP ATTENTION NOTICE*\n\n`;
            let mentions = [];

            for (let mem of participants) {
                text += `@${mem.id.split('@')[0]}\n`;
                mentions.push(mem.id);
            }

            await ctx.sock.sendMessage(ctx.from, { text, mentions });
        }
    },
    {
        name: 'hidetag',
        description: 'Silently mention everyone',
        execute: async (ctx) => {
            if (!ctx.isGroup) return ctx.reply('❌ This command only works in groups.');

            const groupMetadata = await ctx.sock.groupMetadata(ctx.from);
            const participants = groupMetadata.participants;
            const mentions = participants.map(p => p.id);

            const announcement = ctx.args.join(' ') || 'Attention group members!';

            await ctx.sock.sendMessage(ctx.from, { text: announcement, mentions });
        }
    }
];


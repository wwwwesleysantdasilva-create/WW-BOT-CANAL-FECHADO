const fs = require('fs');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        if (config.blocked_channels.includes(message.channel.id)) {
            const isStaff = message.member.roles.cache.some(role => config.staff_roles.includes(role.id));
            if (!isStaff && message.author.id !== message.guild.ownerId) {
                await message.delete().catch(() => {});
                const msg = await message.channel.send(`${message.author}, este canal é restrito.`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
            }
        }
    },
};

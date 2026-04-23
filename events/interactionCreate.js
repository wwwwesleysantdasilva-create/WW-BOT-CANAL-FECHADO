const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const fs = require('fs');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
            const isStaff = interaction.member.roles.cache.some(role => config.staff_roles.includes(role.id));
            if (!isStaff && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ PAINEL DE CONTROLE')
                .setImage('SUA_URL_DA_FOTO_AQUI')
                .setColor(0x2b2d31);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_staff').setLabel('Cargos Staff').setStyle(ButtonStyle.Primary).setEmoji('1478558484088885298'),
                new ButtonBuilder().setCustomId('btn_mod').setLabel('Moderação').setStyle(ButtonStyle.Primary).setEmoji('1478553904848306257')
            );
            await interaction.reply({ embeds: [embed], components: [row] });
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'btn_staff') {
                const select = new RoleSelectMenuBuilder().setCustomId('sel_staff').setPlaceholder('Cargos Staff').setMaxValues(10);
                await interaction.reply({ components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
            }
            if (interaction.customId === 'btn_mod') {
                const select = new ChannelSelectMenuBuilder().setCustomId('sel_chan').setPlaceholder('Canal Bloqueado').addChannelTypes(ChannelType.GuildText);
                await interaction.reply({ components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
            }
        }

        if (interaction.isRoleSelectMenu() && interaction.customId === 'sel_staff') {
            config.staff_roles = Array.from(interaction.values);
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 4));
            await interaction.update({ content: '✅ Staff salva!', components: [] });
        }

        if (interaction.isChannelSelectMenu() && interaction.customId === 'sel_chan') {
            const id = interaction.values[0];
            const idx = config.blocked_channels.indexOf(id);
            idx > -1 ? config.blocked_channels.splice(idx, 1) : config.blocked_channels.push(id);
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 4));
            await interaction.update({ content: '✅ Status do canal alterado!', components: [] });
        }
    },
};

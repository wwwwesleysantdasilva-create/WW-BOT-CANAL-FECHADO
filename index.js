const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    RoleSelectMenuBuilder, 
    ChannelSelectMenuBuilder, 
    ChannelType,
    ComponentType
} = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- FUNÇÕES DE CONFIGURAÇÃO ---
function loadConfig() {
    return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
}

function saveConfig(config) {
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 4));
}

// --- INICIALIZAÇÃO ---
client.once('ready', async () => {
    console.log(`Logado como ${client.user.tag}`);
    // Sincronizar comando /painel
    await client.application.commands.set([
        {
            name: 'painel',
            description: 'Abre o painel de configuração'
        }
    ]);
});

// --- LÓGICA DE BLOQUEIO DE MENSAGENS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const config = loadConfig();
    
    if (config.blocked_channels.includes(message.channel.id)) {
        const isStaff = message.member.roles.cache.some(role => config.staff_roles.includes(role.id));
        const isOwner = message.author.id === message.guild.ownerId;

        if (!isStaff && !isOwner) {
            try {
                await message.delete();
                const reply = await message.channel.send(`${message.author}, isso não é um canal liberado para interação.`);
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            } catch (err) {
                console.log("Erro ao deletar: ", err.message);
            }
        }
    }
});

// --- COMANDO /PAINEL E INTERAÇÕES ---
client.on('interactionCreate', async (interaction) => {
    const config = loadConfig();

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'painel') {
            const isStaff = interaction.member.roles.cache.some(role => config.staff_roles.includes(role.id));
            const isOwner = interaction.user.id === interaction.guild.ownerId;

            if (!isStaff && !isOwner) {
                return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ PAINEL DE CONTROLE')
                .setDescription('Gerencie staff e canais bloqueados.')
                .setColor(0x3498db)
                .setImage('SUA_URL_DA_FOTO_AQUI'); // Coloque sua foto aqui

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_staff')
                    .setLabel('Gerenciar Cargos')
                    .setEmoji('1478558484088885298') // ID do seu emoji
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('btn_mod')
                    .setLabel('Moderação')
                    .setEmoji('1478553904848306257') // ID do seu emoji
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    }

    // Lógica dos Botões e Menus
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_staff') {
            const select = new RoleSelectMenuBuilder()
                .setCustomId('select_staff')
                .setPlaceholder('Escolha os cargos Staff')
                .setMaxValues(10);
            
            await interaction.reply({ components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        if (interaction.customId === 'btn_mod') {
            const select = new ChannelSelectMenuBuilder()
                .setCustomId('select_chan')
                .setPlaceholder('Escolha o canal para bloquear')
                .addChannelTypes(ChannelType.GuildText);

            await interaction.reply({ components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }
    }

    if (interaction.isRoleSelectMenu()) {
        if (interaction.customId === 'select_staff') {
            config.staff_roles = Array.from(interaction.values);
            saveConfig(config);
            await interaction.update({ content: '✅ Cargos Staff salvos!', components: [] });
        }
    }

    if (interaction.isChannelSelectMenu()) {
        if (interaction.customId === 'select_chan') {
            const canalId = interaction.values[0];
            const index = config.blocked_channels.indexOf(canalId);
            
            if (index > -1) {
                config.blocked_channels.splice(index, 1);
                await interaction.update({ content: '🔓 Canal Desbloqueado!', components: [] });
            } else {
                config.blocked_channels.push(canalId);
                await interaction.update({ content: '🔒 Canal Bloqueado!', components: [] });
            }
            saveConfig(config);
        }
    }
});

client.login(process.env.TOKEN);

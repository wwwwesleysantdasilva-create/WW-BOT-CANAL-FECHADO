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
    REST,
    Routes
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

const CONFIG_PATH = './config.json';

// --- DATABASE SIMPLES (JSON) ---
function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ staff_roles: [], blocked_channels: [] }, null, 4));
    }
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
}

// --- REGISTRO DE COMANDOS ---
const commands = [
    {
        name: 'painel',
        description: 'Abre o painel de controle do bot',
    },
];

client.once('ready', async () => {
    console.log(`✅ Logado como ${client.user.tag}`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('🔄 Atualizando comandos / (slash)...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('🚀 Comandos registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
});

// --- SISTEMA DE SEGURANÇA (ON MESSAGE) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const config = loadConfig();
    if (config.blocked_channels.includes(message.channel.id)) {
        const isStaff = message.member.roles.cache.some(role => config.staff_roles.includes(role.id));
        const isOwner = message.author.id === message.guild.ownerId;

        if (!isStaff && !isOwner) {
            try {
                await message.delete();
                const msg = await message.channel.send(`${message.author}, este canal não permite interações.`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
            } catch (e) {}
        }
    }
});

// --- TRATAMENTO DE INTERAÇÕES (ON INTERACTION) ---
client.on('interactionCreate', async (interaction) => {
    const config = loadConfig();

    // 1. COMANDO SLASH
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'painel') {
            const isStaff = interaction.member.roles.cache.some(role => config.staff_roles.includes(role.id));
            const isOwner = interaction.user.id === interaction.guild.ownerId;

            if (!isStaff && !isOwner) {
                return interaction.reply({ content: "❌ Você não tem permissão.", ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ CONFIGURAÇÃO DO BOT')
                .setDescription('Gerencie as funções administrativas pelos botões abaixo.')
                .setColor(0x5865F2)
                .setImage('SUA_URL_DA_FOTO_AQUI'); // Coloque sua foto aqui

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_staff_cfg')
                    .setLabel('Cargos Staff')
                    .setEmoji('1478558484088885298')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('btn_mod_cfg')
                    .setLabel('Moderação')
                    .setEmoji('1478553904848306257')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    }

    // 2. BOTÕES
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_staff_cfg') {
            const select = new RoleSelectMenuBuilder()
                .setCustomId('sel_staff')
                .setPlaceholder('Escolha os cargos permitidos')
                .setMaxValues(10);
            await interaction.reply({ components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        if (interaction.customId === 'btn_mod_cfg') {
            const select = new ChannelSelectMenuBuilder()
                .setCustomId('sel_chan')
                .setPlaceholder('Escolha o canal para bloquear')
                .addChannelTypes(ChannelType.GuildText);
            await interaction.reply({ components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }
    }

    // 3. MENUS DE SELEÇÃO
    if (interaction.isRoleSelectMenu() && interaction.customId === 'sel_staff') {
        config.staff_roles = Array.from(interaction.values);
        saveConfig(config);
        await interaction.update({ content: '✅ Cargos Staff atualizados!', components: [] });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'sel_chan') {
        const id = interaction.values[0];
        const idx = config.blocked_channels.indexOf(id);
        if (idx > -1) {
            config.blocked_channels.splice(idx, 1);
            await interaction.update({ content: '🔓 Canal Desbloqueado!', components: [] });
        } else {
            config.blocked_channels.push(id);
            await interaction.update({ content: '🔒 Canal Bloqueado!', components: [] });
        }
        saveConfig(config);
    }
});

client.login(process.env.TOKEN);

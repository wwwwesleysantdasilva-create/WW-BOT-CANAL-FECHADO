const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    RoleSelectMenuBuilder, 
    ChannelSelectMenuBuilder, 
    ChannelType 
} = require('discord.js');
const fs = require('fs');
const os = require('os');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- SISTEMA DE CONFIGURAÇÃO (CHECKUP: OK) ---
const CONFIG_PATH = './config.json';

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ staff_roles: [], blocked_channels: [] }, null, 4));
    }
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { staff_roles: [], blocked_channels: [] };
    }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
}

// --- INICIALIZAÇÃO ---
client.once('ready', async () => {
    console.log(`✅ Logado com sucesso como ${client.user.tag}`);
    
    // Registra o comando globalmente
    await client.application.commands.set([
        {
            name: 'painel',
            description: 'Abre o painel administrativo do bot'
        }
    ]);
});

// --- LÓGICA DE SEGURANÇA E BLOQUEIO ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const config = loadConfig();
    
    if (config.blocked_channels.includes(message.channel.id)) {
        const isStaff = message.member.roles.cache.some(role => config.staff_roles.includes(role.id));
        const isOwner = message.author.id === message.guild.ownerId;

        if (!isStaff && !isOwner) {
            try {
                await message.delete();
                const aviso = await message.channel.send(`${message.author}, isso não é um canal liberado para interação.`);
                setTimeout(() => aviso.delete().catch(() => {}), 5000);
            } catch (err) {
                console.error("Erro ao deletar mensagem:", err.message);
            }
        }
    }
});

// --- INTERAÇÕES (PAINEL E BOTÕES) ---
client.on('interactionCreate', async (interaction) => {
    const config = loadConfig();

    // Comando Slash /painel
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'painel') {
            const isStaff = interaction.member.roles.cache.some(role => config.staff_roles.includes(role.id));
            const isOwner = interaction.user.id === interaction.guild.ownerId;

            if (!isStaff && !isOwner) {
                return interaction.reply({ content: "❌ Acesso negado ao painel.", ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ PAINEL DE CONTROLE CENTRAL')
                .setDescription('Selecione uma opção abaixo para configurar o servidor.')
                .setColor(0x2b2d31)
                .setImage('SUA_URL_DA_FOTO_AQUI'); // <--- COLOQUE SUA FOTO AQUI

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_staff')
                    .setLabel('Gerenciar Cargos')
                    .setEmoji('1478558484088885298') 
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('btn_mod')
                    .setLabel('Moderação')
                    .setEmoji('1478553904848306257')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    }

    // Resposta aos Botões
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_staff') {
            const select = new RoleSelectMenuBuilder()
                .setCustomId('select_staff')
                .setPlaceholder('Escolha os cargos que podem usar o bot')
                .setMaxValues(10);
            
            const row = new ActionRowBuilder().addComponents(select);
            await interaction.reply({ content: 'Selecione os cargos Staff:', components: [row], ephemeral: true });
        }

        if (interaction.customId === 'btn_mod') {
            const select = new ChannelSelectMenuBuilder()
                .setCustomId('select_chan')
                .setPlaceholder('Escolha o canal para bloquear/desbloquear')
                .addChannelTypes(ChannelType.GuildText);

            const row = new ActionRowBuilder().addComponents(select);
            await interaction.reply({ content: 'Gerenciar bloqueio de canais:', components: [row], ephemeral: true });
        }
    }

    // Resposta aos Menus de Seleção
    if (interaction.isRoleSelectMenu() && interaction.customId === 'select_staff') {
        config.staff_roles = Array.from(interaction.values);
        saveConfig(config);
        await interaction.update({ content: '✅ Cargos Staff atualizados com sucesso!', components: [] });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'select_chan') {
        const canalId = interaction.values[0];
        const index = config.blocked_channels.indexOf(canalId);
        
        if (index > -1) {
            config.blocked_channels.splice(index, 1);
            await interaction.update({ content: '🔓 Canal **DESBLOQUEADO**!', components: [] });
        } else {
            config.blocked_channels.push(canalId);
            await interaction.update({ content: '🔒 Canal **BLOQUEADO**! (Membros não podem falar)', components: [] });
        }
        saveConfig(config);
    }
});

client.login(process.env.TOKEN);

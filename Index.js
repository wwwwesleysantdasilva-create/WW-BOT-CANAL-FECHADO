require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, Events, REST, Routes, SlashCommandBuilder 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let configBot = { canalId: null, cargoExcecao: null };

const commands = [
    new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Abre o painel de configuração do bot')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Bot online: ${c.user.tag}`);
    try {
        await rest.put(
            Routes.applicationCommands(c.user.id),
            { body: commands },
        );
        console.log('Comandos (/) registrados!');
    } catch (error) {
        console.error(error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'painel') {
            const embed = new EmbedBuilder()
                .setTitle('⚙️ Painel de Controle')
                .setDescription('Clique nos botões azuis para configurar o sistema.')
                .setColor('#0099ff')
                // Abaixo está o link que você mandou aplicado ao painel:
                .setImage('https://cdn.discordapp.com/attachments/1496697294769360906/1496753704261652551/34C15481-EB2C-47EA-B44C-C9FAA20E9B68.jpg?ex=69eb0803&is=69e9b683&hm=72adc3c26d7d213a90b7afe68dd8c9901bfbdb363cfa27724c88f060100536bc&');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('set_canal')
                    .setLabel('Definir Canal')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('set_excecao')
                    .setLabel('Definir Exceção')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'set_canal') {
            configBot.canalId = interaction.channelId;
            await interaction.reply({ content: `✅ Canal <#${interaction.channelId}> configurado para apagar mensagens!`, ephemeral: true });
        }
        if (interaction.customId === 'set_excecao') {
            configBot.cargoExcecao = interaction.member.roles.highest.id;
            await interaction.reply({ content: `✅ Exceção definida para: **${interaction.member.roles.highest.name}**`, ephemeral: true });
        }
    }
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !configBot.canalId) return;

    if (message.channel.id === configBot.canalId) {
        if (!message.member.roles.cache.has(configBot.cargoExcecao)) {
            const textoOriginal = message.content;
            await message.delete().catch(() => {});

            // Resposta simulando o "somente você pode ler" (enviando e apagando)
            const aviso = await message.channel.send(`⌨️ **${message.author.username}**, comando interpretado: \`${textoOriginal}\``);
            setTimeout(() => aviso.delete().catch(() => {}), 5000);
        }
    }
});

client.login(process.env.TOKEN);

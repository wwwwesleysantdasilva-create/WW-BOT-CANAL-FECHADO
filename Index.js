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

// Configuração em memória (No Railway, isso reseta ao reiniciar)
let configBot = { canalId: null, cargoExcecao: null };

// 1. Definição do comando /painel
const commands = [
    new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Abre o painel de configuração do bot')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Bot online: ${c.user.tag}`);
    
    // 2. Registra os comandos no Discord automaticamente
    try {
        console.log('Atualizando comandos (/) no Discord...');
        await rest.put(
            Routes.applicationCommands(c.user.id),
            { body: commands },
        );
        console.log('Comandos registrados com sucesso!');
    } catch (error) {
        console.error(error);
    }
});

// 3. Ouvindo o comando /painel
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'painel') {
            const embed = new EmbedBuilder()
                .setTitle('⚙️ Painel de Controle')
                .setDescription('Use os botões abaixo para configurar as funções.')
                .setColor('#0099ff')
                .setImage('https://sua-foto-aqui.jpg'); // COLOQUE SEU LINK AQUI

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('set_canal')
                    .setLabel('Definir Canal')
                    .setStyle(ButtonStyle.Primary), // Azul
                new ButtonBuilder()
                    .setCustomId('set_excecao')
                    .setLabel('Definir Exceção')
                    .setStyle(ButtonStyle.Primary) // Azul
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }
    }

    // 4. Lógica dos Botões
    if (interaction.isButton()) {
        if (interaction.customId === 'set_canal') {
            configBot.canalId = interaction.channelId;
            await interaction.reply({ content: `✅ Canal <#${interaction.channelId}> configurado!`, ephemeral: true });
        }
        if (interaction.customId === 'set_excecao') {
            configBot.cargoExcecao = interaction.member.roles.highest.id;
            await interaction.reply({ content: `✅ Exceção definida para o cargo: **${interaction.member.roles.highest.name}**`, ephemeral: true });
        }
    }
});

// 5. Lógica de apagar mensagens (Interpretador)
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !configBot.canalId) return;

    if (message.channel.id === configBot.canalId) {
        // Se NÃO tiver o cargo de exceção
        if (!message.member.roles.cache.has(configBot.cargoExcecao)) {
            const texto = message.content;
            await message.delete().catch(() => {});

            // Resposta que "Só você pode ler" (Ephemeral)
            // IMPORTANTE: Mensagens comuns não podem ser efêmeras. 
            // O bot vai enviar e apagar logo depois para simular.
            const aviso = await message.channel.send(`⌨️ **${message.author.username}**, comando interpretado: \`${texto}\``);
            setTimeout(() => aviso.delete().catch(() => {}), 4000);
        }
    }
});

client.login(process.env.TOKEN);

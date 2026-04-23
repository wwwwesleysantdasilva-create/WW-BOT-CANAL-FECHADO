require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, Events 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configuração temporária (em produção, use um banco de dados como MongoDB)
let configBot = {
    canalId: null,
    cargoExcecao: null
};

client.once(Events.ClientReady, c => {
    console.log(`✅ Bot online: ${c.user.tag}`);
});

// Resposta ao comando !painel
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (message.content === '!painel') {
        const embed = new EmbedBuilder()
            .setTitle('Painel de Controle')
            .setDescription('Clique nos botões azuis para configurar.')
            .setColor('#0099ff') // Cor azul
            .setImage('COLOQUE_AQUI_O_LINK_DA_FOTO.jpg');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_canal')
                    .setLabel('Configurar Canal')
                    .setStyle(ButtonStyle.Primary), // Azul
                new ButtonBuilder()
                    .setCustomId('set_excecao')
                    .setLabel('Definir Exceção')
                    .setStyle(ButtonStyle.Primary) // Azul
            );

        await message.channel.send({ embeds: [embed], components: [row] });
        return;
    }

    // Lógica: Apagar mensagem e interpretar como comando
    if (configBot.canalId && message.channel.id === configBot.canalId) {
        if (!message.member.roles.cache.has(configBot.cargoExcecao)) {
            
            await message.delete().catch(() => {});

            // Resposta de "comando interpretado"
            // Nota: O "Somente você pode ver" (ephemeral) funciona apenas em BOTÕES ou SLASH COMMANDS
            const msgLink = await message.channel.send({
                content: `Mensagem de ${message.author}: Comando registrado com sucesso! ⌨️`
            });

            // Apaga o aviso após 5 segundos para manter o canal limpo
            setTimeout(() => msgLink.delete().catch(() => {}), 5000);
        }
    }
});

// Interação com os botões do painel
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'set_canal') {
        configBot.canalId = interaction.channelId;
        await interaction.reply({ content: '✅ Este canal foi configurado para apagar mensagens!', ephemeral: true });
    }

    if (interaction.customId === 'set_excecao') {
        // Define o cargo mais alto do usuário como exceção para teste
        configBot.cargoExcecao = interaction.member.roles.highest.id;
        await interaction.reply({ content: `✅ Cargo ${interaction.member.roles.highest.name} definido como exceção!`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);


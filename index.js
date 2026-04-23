import discord
from discord.ext import commands
from discord import app_commands
import json
import os

# --- FUNÇÕES DE CONFIGURAÇÃO (JSON) ---
def load_config():
    if not os.path.exists('config.json'):
        with open('config.json', 'w') as f:
            json.dump({"staff_roles": [], "blocked_channels": []}, f, indent=4)
    
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except:
        return {"staff_roles": [], "blocked_channels": []}

def save_config(config):
    with open('config.json', 'w') as f:
        json.dump(config, f, indent=4)

# --- CLASSE DA INTERFACE (BOTÕES E MENUS) ---
class PainelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None) # Mantém os botões ativos após reiniciar

    # BOTÃO 1 - GERENCIAR CARGOS
    @discord.ui.button(label="Gerenciar Cargos", style=discord.ButtonStyle.blurple, custom_id="btn_staff", emoji="<:emoji_39:1478558484088885298>")
    async def staff_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        select = discord.ui.RoleSelect(placeholder="Selecione os cargos Staff...", max_values=10)
        
        async def select_callback(inter: discord.Interaction):
            config = load_config()
            config["staff_roles"] = [role.id for role in select.values]
            save_config(config)
            await inter.response.send_message(f"✅ Permissões atualizadas para {len(select.values)} cargo(s)!", ephemeral=True)

        view = discord.ui.View()
        view.add_item(select)
        select.callback = select_callback
        await interaction.response.send_message("Selecione quem pode gerenciar o bot:", view=view, ephemeral=True)

    # BOTÃO 2 - MODERAÇÃO (BLOQUEAR CANAL)
    @discord.ui.button(label="Moderação", style=discord.ButtonStyle.blurple, custom_id="btn_mod", emoji="<:emoji_37:1478553904848306257>")
    async def mod_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        select = discord.ui.ChannelSelect(
            placeholder="Selecione o canal para bloquear/desbloquear...",
            channel_types=[discord.ChannelType.text]
        )

        async def channel_callback(inter: discord.Interaction):
            config = load_config()
            canal_id = select.values[0].id
            
            if canal_id in config["blocked_channels"]:
                config["blocked_channels"].remove(canal_id)
                status = "🔓 Canal DESBLOQUEADO!"
            else:
                config["blocked_channels"].append(canal_id)
                status = "🔒 Canal BLOQUEADO! (Apenas Staff pode falar)"
            
            save_config(config)
            await inter.response.send_message(status, ephemeral=True)

        view = discord.ui.View()
        view.add_item(select)
        select.callback = channel_callback
        await interaction.response.send_message("Gerenciamento de canais de interação:", view=view, ephemeral=True)

# --- CLASSE PRINCIPAL DO BOT ---
class MyBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        # Registra a View persistente para que os botões funcionem após o bot reiniciar
        self.add_view(PainelView())
        await self.tree.sync()
        print(f"Comandos sincronizados e View ativa.")

bot = MyBot()

# --- EVENTOS ---
@bot.event
async def on_ready():
    print(f'Logado como {bot.user} (ID: {bot.user.id})')

@bot.event
async def on_message(message):
    if message.author.bot:
        return

    config = load_config()
    
    # Lógica de bloqueio de canal
    if message.channel.id in config["blocked_channels"]:
        user_roles = [role.id for role in message.author.roles]
        is_staff = any(role_id in config["staff_roles"] for role_id in user_roles)
        is_owner = message.author.id == message.guild.owner_id

        if not is_staff and not is_owner:
            try:
                await message.delete()
                # Envia mensagem que some em 5 segundos
                await message.channel.send(f"❌ {message.author.mention}, isso não é um canal liberado para interação.", delete_after=5)
            except:
                pass
    
    await bot.process_commands(message)

# --- COMANDO SLASH /PAINEL ---
@bot.tree.command(name="painel", description="Abre o painel de configuração")
async def painel(interaction: discord.Interaction):
    config = load_config()
    
    # Segurança: Apenas dono ou staff configurada
    user_roles = [role.id for role in interaction.user.roles]
    is_staff = any(role_id in config["staff_roles"] for role_id in user_roles)
    is_owner = interaction.user.id == interaction.guild.owner_id

    if not is_staff and not is_owner:
        await interaction.response.send_message("🚫 Acesso negado ao painel.", ephemeral=True)
        return

    embed = discord.Embed(
        title="PAINEL DE CONTROLE",
        description="Gerencie as permissões e canais bloqueados pelos botões abaixo.",
        color=0x2b2d31
    )
    # Substitua pelo link da sua foto fixa:
    embed.set_image(url="https://sua-imagem.png")
    
    await interaction.response.send_message(embed=embed, view=PainelView())

# --- INICIALIZAÇÃO NO RAILWAY ---
if __name__ == "__main__":
    TOKEN = os.getenv("TOKEN") # Railway busca aqui
    if TOKEN:
        bot.run(TOKEN)
    else:
        print("ERRO: Variável de ambiente 'TOKEN' não encontrada!")

# AgafBot - Bot Inteligente para WhatsApp

O AgafBot é um chatbot para WhatsApp que utiliza inteligência artificial para responder às mensagens de usuários de forma inteligente e personalizada.

## Funcionalidades

- **Sistema de Menus Interativo**: Permite navegar por opções predefinidas com respostas personalizadas
- **Integração com IA**: Utiliza a API Groq (modelo Llama3) para gerar respostas quando não há conteúdo predefinido
- **Base de Conhecimento Personalizável**: Interface web para adicionar, editar e remover informações na base de conhecimento
- **Respostas Predefinidas**: Sistema de palavras-chave com respostas automáticas
- **Suporte a Múltiplos Idiomas**: Português, Inglês, Espanhol, Francês, Russo, Chinês, Turco, Japonês, Árabe e Coreano
- **Interface Web Administrativa**: Painel para gerenciar configurações, base de conhecimento e respostas

## Requisitos

- Node.js (v14 ou superior)
- SQLite
- Chave de API Groq (para funcionalidades de IA)
- Dispositivo para escanear o QR Code do WhatsApp Web

## Instalação

1. Clone o repositório:
   ```
   git clone https://github.com/agaf07/AgafBot.git
   cd AgafBot
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Configure sua chave de API Groq (necessária para funcionalidades de IA):
   - Acesse o painel web em http://localhost:3000
   - Na página de configurações, adicione sua chave de API

4. Inicie o aplicativo:
   ```
   npm start
   ```

5. Escaneie o QR code que aparecerá no terminal com seu WhatsApp para autenticar o bot.

## Como Usar

### Painel Web Administrativo
- Acesse `http://localhost:3000` para acessar o painel de controle
- Gerencie configurações em `/settings`
- Adicione respostas predefinidas em `/responses`
- Gerencie sua base de conhecimento em `/knowledge`
- Configure menus interativos em `/menus`

### Comandos do WhatsApp
- Envie `!menu` para ver o menu principal
- Digite o número da opção para selecionar
- Para todas as outras mensagens, o bot responderá usando respostas predefinidas ou IA

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para mais detalhes.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests. "# AgafBot" 

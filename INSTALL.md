# Guia de Instalação do AgafBot

## Instalação no Windows

1. Baixe o arquivo ZIP contendo o AgafBot para Windows
2. Extraia o conteúdo para uma pasta de sua escolha
3. Execute o arquivo `start.bat` para iniciar o programa
4. Acesse o painel administrativo em http://localhost:3000
5. Escaneie o QR code com seu WhatsApp para conectar o bot

## Instalação no Linux

1. Baixe o arquivo TAR.GZ contendo o AgafBot para Linux
2. Extraia o conteúdo para uma pasta de sua escolha:
   ```
   tar -xzvf agafbot-linux.tar.gz
   ```
3. Torne o script de inicialização executável:
   ```
   chmod +x start.sh
   ```
4. Execute o script de inicialização:
   ```
   ./start.sh
   ```
5. Acesse o painel administrativo em http://localhost:3000
6. Escaneie o QR code com seu WhatsApp para conectar o bot

## Configurações Iniciais

1. Na primeira execução, o banco de dados será criado automaticamente
2. Entre em `Configurações` e adicione sua chave de API Groq (para funcionalidades de IA)
3. Comece a adicionar suas respostas predefinidas e conteúdo para a base de conhecimento

## Solução de Problemas

- **Erro ao iniciar**: Verifique se as portas 3000 e 8080 estão disponíveis
- **Erro ao conectar WhatsApp**: Tente escanear o QR code novamente ou reinicie o aplicativo
- **Imagens não aparecem**: Certifique-se de ter adicionado as imagens na pasta `public/img`

## Contato e Suporte

Para dúvidas ou suporte, entre em contato por email: antoniofigueiredoha@gmail.com 
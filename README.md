# Placar de Vôlei

Placar eletrônico web para partidas de vôlei — leve, offline e instalável como PWA no celular. Construído com **HTML, CSS e JavaScript puro**, sem framework e sem etapa de build.

## Funcionalidades

- **Placar em tela cheia** dividido em dois lados tocáveis (Time A e Time B)
- **Toque** em qualquer área do time: +1 ponto
- **Arrastar para baixo** sobre a área do time: −1 ponto (desfazer)
- Nomes e cores dos times editáveis
- **Configurações** persistentes em `localStorage`:
  - Pontuação limite (15, 21, 25 ou sem limite)
  - Regra de vitória com 2+ pontos de diferença (deuce)
  - Animação de comemoração ao vencer
- Lógica completa de fim de partida conforme regras configuradas
- **PWA instalável** com service worker e suporte offline
- **QR Code** para compartilhar o link e instalar no celular
- Animação de confete opcional ao vencer (`canvas-confetti`)

## Como rodar localmente

Como não há bundler, basta servir os arquivos estáticos:

```bash
# Opção 1: npx serve
npx serve .

# Opção 2: Python
python3 -m http.server 8080

# Opção 3: extensão Live Server no VS Code / Cursor
```

Abra `http://localhost:3000` (ou a porta indicada) no navegador.

> **Nota:** O service worker e a instalação como PWA exigem HTTPS ou `localhost`.

## Deploy no Netlify

### Opção A — Arrastar pasta

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Arraste a pasta do projeto para a área de deploy
3. O Netlify publicará a raiz automaticamente (configurado em `netlify.toml`)

### Opção B — Repositório Git

1. Envie o projeto para GitHub/GitLab/Bitbucket
2. No Netlify: **Add new site → Import an existing project**
3. Conecte o repositório
4. **Build command:** deixe vazio
5. **Publish directory:** `.` (raiz)
6. Clique em **Deploy**

O arquivo `netlify.toml` já define `publish = "."` sem comando de build.

## Estrutura de arquivos

```
index.html              # Página principal
styles.css              # Estilos (variáveis CSS, Flexbox/Grid)
app.js                  # Lógica do placar, gestos, PWA
sw.js                   # Service worker (cache app-shell)
manifest.webmanifest    # Manifesto PWA
offline.html            # Fallback offline
icons/                  # Ícones 192, 512 e maskable
netlify.toml            # Configuração Netlify
```

## Compatibilidade

Testado mentalmente e implementado com feature-detection para:

- Chrome / Edge (desktop e Android)
- Safari (iOS e macOS)
- Firefox

O placar funciona mesmo se as libs CDN (confete e QR Code) não carregarem — há degradação graciosa.

## Licença

Uso livre para projetos pessoais e comerciais.

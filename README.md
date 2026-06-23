# Bugsy

Bugsy é uma aplicação para gravar evidências diretamente do navegador, enviar o vídeo para a nuvem, organizar as gravações em uma biblioteca e compartilhar links públicos.

O produto foi inspirado em ferramentas como Jam e nasceu para um fluxo simples de suporte, QA e desenvolvimento:

```txt
Gravar uma aba -> revisar o vídeo -> fazer upload -> salvar metadados -> compartilhar um link público
```

## Demo

URLs de produção:

- App web: `adicione-a-url-do-app-aqui`
- Health check da API: `adicione-a-url-da-api-aqui/health`
- Download da extensão: `adicione-o-link-do-drive-ou-release-aqui`

A extensão ainda não está publicada na Chrome Web Store. Por enquanto, ela pode ser instalada manualmente a partir da build de produção.

## O Que O Bugsy Faz

- Grava a aba atual do Google Chrome.
- Exibe uma barra flutuante com controles de pausa e parada.
- Envia o vídeo capturado para o fluxo de preview do app web.
- Faz upload do vídeo para a API.
- Armazena o arquivo no Supabase Storage.
- Salva os metadados da gravação no PostgreSQL usando Prisma.
- Gera uma página pública para cada gravação.
- Permite listar, buscar, editar, copiar link e excluir gravações no dashboard.
- Usa login com Google para vincular as gravações ao usuário autenticado.

## Stack

### Monorepo

- pnpm workspaces
- TypeScript
- ESLint
- Prettier

### Web App

- Next.js App Router
- React
- Tailwind CSS
- Auth.js com Google Provider
- Server Actions
- Lucide Icons

### API

- Node.js
- Fastify
- Prisma ORM
- PostgreSQL
- Zod
- Tokens internos com JWT
- Upload multipart
- Vitest

### Extensão

- Chrome Extension Manifest V3
- Vite
- TypeScript
- MediaRecorder API
- Offscreen Document API
- Chrome Runtime Messaging
- Chrome Tabs API
- Chrome Scripting API

### Infraestrutura

- Web: Vercel
- API: Render
- Banco de dados: Supabase PostgreSQL
- Storage: Supabase Storage

## Arquitetura

```txt
apps/
  web/         aplicação Next.js
  api/         API Fastify
  extension/   extensão Chrome

packages/
  shared/      tipos e utilitários compartilhados
```

A extensão grava a aba localmente e envia o arquivo capturado para a página de preview do Next.js. O app web solicita um token interno de curta duração, envia o vídeo para a API e a API salva o arquivo e os metadados no Supabase.

```txt
Extensão Chrome
  -> Preview no Next.js
  -> Endpoint de upload no Fastify
  -> Supabase Storage
  -> Metadados no PostgreSQL
  -> Página pública compartilhável
```

## Fluxos Principais

### Fluxo De Gravação

1. O usuário abre qualquer aba regular `http` ou `https`.
2. O usuário inicia a gravação pelo popup da extensão.
3. O Bugsy captura a aba, com áudio opcional.
4. A barra flutuante aparece no rodapé da página.
5. O usuário para a gravação.
6. O Bugsy abre a página de preview no app web.
7. O usuário informa título e descrição.
8. O vídeo é enviado e salvo.
9. A página pública abre automaticamente.

### Fluxo Do Dashboard

1. O usuário entra com Google.
2. O dashboard lista apenas as gravações daquele usuário.
3. O usuário pode buscar, editar metadados, copiar links públicos, abrir páginas públicas e excluir gravações.

## Como Usar

Enquanto a extensão não estiver publicada na Chrome Web Store, ela pode ser instalada manualmente.

1. Acesse o app web:

```txt
adicione-a-url-do-app-aqui
```

2. Entre com sua conta Google.

3. Baixe o pacote da extensão:

```txt
adicione-o-link-do-drive-ou-release-aqui
```

4. Extraia o arquivo `.zip`.

5. Abra o Chrome e acesse:

```txt
chrome://extensions
```

6. Ative o **Modo do desenvolvedor**.

7. Clique em **Carregar sem compactação**.

8. Selecione a pasta extraída que contém o arquivo `manifest.json`.

9. Fixe o Bugsy na barra do Chrome.

10. Abra uma aba regular `http` ou `https` e clique em **Start Recording**.

11. Ao finalizar, a extensão abrirá o preview no app web.

12. Adicione título e descrição, envie o vídeo e compartilhe o link público gerado.

Importante: o Chrome não instala extensões descompactadas diretamente a partir de um `.zip`. O pacote precisa ser extraído antes.

## Por Que Esse Projeto É Relevante

O Bugsy demonstra um fluxo completo de produto envolvendo frontend, backend, APIs de extensão do navegador, autenticação, upload de arquivos, storage, persistência em banco de dados e deploy em produção.

Ele foi construído como um MVP real, não como uma página estática de portfolio. O objetivo principal é provar o fluxo completo de ponta a ponta: da gravação no navegador até o link público compartilhável.

## Autor

Desenvolvido por **Gabriel Neves**.

- GitHub: [Gabriel-Neves-fs](https://github.com/Gabriel-Neves-fs)
- LinkedIn: [Gabriel Neves](https://www.linkedin.com/in/gabriel-neves-fs/)
- Email: [gabriel.neves.dev@gmail.com](mailto:gabriel.neves.dev@gmail.com)

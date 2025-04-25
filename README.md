<div align="center">
<img src="https://raw.githubusercontent.com/shiftwo-app/shiftwo/main/.github/logo_standard.svg" alt="Shiftwo / シフトヲ" style="max-width: 400px;" />
</div>

## Getting Started

First, add `.env` file to the root directory.  
You can copy `env.example` file and rename it to .env.

```bash
cp env.example .env
```

Of course you should change the environment variables in the .env file.  
Espacially username, password, server url, and database name.  
(The .env.example is include the default values for Devcontainer.)

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

```bash
cd .devcontainer && docker-compose up -d

npx prisma migrate dev

pnpm prisma:seed

pnpm dev
```

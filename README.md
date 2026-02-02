
# HospedaPro - Hotel Management System

Sistema de gestão hoteleira focado em fluxos de limpeza (Fator Mamãe), lavanderia e controle financeiro.

## 🚀 Como rodar localmente

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz e adicione sua chave:
   ```env
   VITE_GEMINI_API_KEY=sua_chave_aqui
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🌍 Deploy na Vercel

1. Suba este código para um repositório no seu GitHub.
2. No dashboard da Vercel, clique em **"New Project"** e importe o repositório.
3. Nas configurações, adicione a **Environment Variable**:
   - Key: `VITE_GEMINI_API_KEY`
   - Value: (Sua chave do Google Gemini)
4. Clique em **Deploy**.

## 🛠 Tecnologias
- React 19
- Vite
- TypeScript
- Tailwind CSS
- Zustand (Gerenciamento de Estado)
- Lucide React (Ícones)
- Recharts (Dashboards)

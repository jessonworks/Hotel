
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Boundary de erro simples para evitar tela branca silenciosa
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Critical Render Error:", error);
  rootElement.innerHTML = `
    <div style="padding: 40px; text-align: center; font-family: sans-serif;">
      <h1>Ops! Ocorreu um erro ao carregar.</h1>
      <p>Por favor, recarregue a página ou verifique o console do navegador.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer;">
        Recarregar Página
      </button>
    </div>
  `;
}

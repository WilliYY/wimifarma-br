# Checklist de Producao

- Criar `.env` no servidor a partir de `.env.example`.
- Trocar `AUTH_SECRET`.
- Trocar `POSTGRES_PASSWORD`.
- Trocar `ADMIN_PASSWORD`.
- Ajustar `NEXTAUTH_URL` e `AUTH_URL` para o dominio real.
- Confirmar que Postgres nao tem porta publica.
- Rodar migrations.
- Rodar seed inicial.
- Verificar health em `127.0.0.1:3001/api/health`.
- Conectar Nginx Proxy Manager na rede `wimifarma-br-network`.
- Configurar certificado SSL.
- Testar `/`, `/ofertas`, `/admin/login` e `/api/health`.

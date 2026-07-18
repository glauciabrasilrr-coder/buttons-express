# BUTTONS EXPRESS MASTER

> Documento oficial do projeto Buttons Express.
> Este arquivo registra a arquitetura, decisões técnicas, funcionalidades implementadas e histórico de alterações.

---

# IDENTIFICAÇÃO

**Projeto:** Buttons Express

**Empresa:** Bem Bolado

**Objetivo:**
Sistema para atendimento em feiras e eventos, eliminando o uso do WhatsApp durante o atendimento.

---

# STACK

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Supabase
- Vercel

---

# FLUXO DO CLIENTE

1. Home
2. Produtos
3. Fotos
4. Resumo
5. Pagamento
6. Obrigado

---

# FLUXO ADMINISTRATIVO

Painel de Produção

Rota:

/fila

Proteção:

AdminRoute

Autenticação:

Supabase Auth

---

# BANCO

Supabase

Tabela principal:

pedidos

Storage:

fotos-pedidos

---

# FUNCIONALIDADES IMPLEMENTADAS

✔ Cadastro de pedidos

✔ Upload de fotos

✔ Organização automática

✔ Resumo do pedido

✔ Pagamento

✔ Fila de produção

✔ Download individual

✔ Download ZIP

✔ Alteração de status

✔ Exclusão de pedidos

✔ Exclusão de fotos

✔ Login administrativo

✔ Deploy automático Vercel

---

# OTIMIZAÇÕES REALIZADAS

## Storage

Corrigido consumo excessivo de Egress.

Melhorias implementadas:

- cache de fotos
- redução do polling
- menor quantidade de URLs assinadas
- atualização otimizada da fila

---

# STATUS DO PROJETO

Situação atual:

✅ MVP funcional em produção

URL:

https://buttons-express.vercel.app

---

# REGRAS DO PROJETO

Antes de qualquer alteração:

- Auditar o arquivo completo.
- Não recriar funcionalidades existentes.
- Não alterar visual aprovado.
- Não alterar banco sem necessidade.
- Fazer uma alteração por vez.
- Executar build.
- Publicar.
- Validar em produção.
- Registrar alterações neste documento.

---

# HISTÓRICO

## Versão 1.0

- Fluxo completo do cliente implementado.
- Painel administrativo implementado.
- Upload funcionando.
- Download ZIP funcionando.
- Proteção administrativa funcionando.
- Correção do consumo de Egress implementada.
- Deploy em produção realizado.
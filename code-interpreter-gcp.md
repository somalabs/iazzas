# Code Interpreter Self-Hosted — Arquitetura GCP

## O que o LibreChat espera

A API de code interpreter precisa implementar 3 endpoints:

| Método | Endpoint | O que faz |
|--------|----------|-----------|
| `POST` | `/v1/exec` | Recebe `{ lang, code, args, files }`, retorna `{ stdout, stderr, files, session_id }` |
| `GET` | `/v1/files/{session_id}` | Lista arquivos da sessão |
| `GET` | `/v1/download/{session_id}/{id}` | Baixa um arquivo |

Autenticação via header `X-API-Key`.

---

## Arquitetura na GCP

```
                    LibreChat (backend)
                         │
                    X-API-Key header
                         │
                         ▼
               ┌─────────────────────┐
               │   Cloud Run (API)   │  ← Thin API service
               │   Node/Python app   │     Recebe requests, gerencia sessões
               └────────┬────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ Cloud Run│  │ Cloud Run│  │ Cloud Run│  ← Sandboxed execution
     │  Job     │  │  Job     │  │  Job     │     (1 job por execução)
     └──────────┘  └──────────┘  └──────────┘
                         │
                         ▼
               ┌─────────────────────┐
               │  Cloud Storage      │  ← Arquivos de sessão
               │  (bucket temporário)│     TTL de 24h via lifecycle
               └─────────────────────┘
```

### Componentes

1. **Cloud Run (API Gateway)** — Serviço principal que recebe as requests do LibreChat, valida a API key, e orquestra a execução.

2. **Cloud Run Jobs** — Cada execução de código roda como um job isolado em container. Cloud Run já usa **gVisor** como sandbox, então o código do usuário roda isolado por padrão. Imagens Docker separadas por linguagem (Python, Node, etc.).

3. **Cloud Storage** — Bucket para arquivos gerados pelo código. Lifecycle rule para deletar após 24h.

---

## Alternativa mais simples: Cloud Run + Piston

O [Piston](https://github.com/engineer-man/piston) é um engine open-source de execução de código que já suporta 50+ linguagens. Basta criar um adapter:

```
  LibreChat → Cloud Run (adapter API) → Piston (Cloud Run)
                                             │
                                        Cloud Storage
```

- Deploy do Piston como Cloud Run service.
- Pequeno serviço adapter que traduz a API do LibreChat para a API do Piston.
- O adapter implementa os 3 endpoints que o LibreChat espera.

---

## Custo estimado

| Serviço | Custo |
|---------|-------|
| Cloud Run (API) | ~$0 (free tier cobre uso leve) |
| Cloud Run (Piston) | ~$5-15/mês dependendo do uso |
| Cloud Storage | < $1/mês |

---

## Configuração no LibreChat

Após o deploy, configurar no `.env`:

```env
LIBRECHAT_CODE_API_KEY=sua-chave-definida-no-adapter
LIBRECHAT_CODE_BASEURL=https://seu-servico.run.app/v1
```

Reiniciar o backend para aplicar.

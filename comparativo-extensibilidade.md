# Comparativo de Extensibilidade: LibreChat vs OpenWebUI

## Resumo

Ambas as plataformas permitem estender funcionalidades além do chat básico, mas com abordagens arquiteturais distintas.

---

## OpenWebUI

### Tools (Ferramentas)
- **Código Python inline**: funções Python escritas diretamente na UI do admin
- **Convenção de classe**: cada Tool é uma classe Python com métodos que o modelo pode invocar
- **Acesso a estado**: recebe contexto do usuário, conversa e configurações
- **Instalação de dependências**: pode importar bibliotecas Python disponíveis no ambiente
- **Exemplo**: Tool que consulta uma API REST, faz scraping, ou acessa banco de dados

### Skills (Habilidades)
- Skills no OpenWebUI são essencialmente **sinônimo de Tools** — o termo foi consolidado
- A diferença semântica era que Skills seriam mais "compostas" (agrupando múltiplas tools), mas na prática a implementação convergiu

### Pipelines
- **Middleware de processamento**: interceptam e transformam mensagens antes/depois do modelo
- **Filtros**: modificam input/output (ex: PII masking, tradução, formatação)
- **Pipes**: redirecionam para backends alternativos (modelos locais, APIs custom)
- **Código Python**: também escritos inline na UI

### Vantagens
- Tudo editável pela UI sem deploy
- Baixa barreira de entrada (Python puro)
- Hot-reload imediato

### Limitações
- Execução no mesmo processo do servidor (risco de segurança)
- Sem sandboxing robusto
- Escalabilidade limitada (single-process)

---

## LibreChat

### MCP (Model Context Protocol)
- **Protocolo padronizado** (spec da Anthropic) para integração de ferramentas externas
- **Servidores MCP**: processos separados que expõem tools, resources e prompts
- **Transporte**: stdio (local) ou SSE/StreamableHTTP (remoto)
- **Ecossistema**: milhares de servidores MCP open-source disponíveis
- **Configuração**: via `librechat.yaml` no bloco `mcpServers`
- **Exemplo**: MCP server que acessa Slack, GitHub, banco de dados, filesystem

### Actions (Ações)
- **OpenAPI-based**: define endpoints REST via spec OpenAPI/Swagger
- **Configuração por agente**: cada agente pode ter Actions diferentes
- **Autenticação**: suporta API Key, OAuth, Bearer token
- **Sem código custom**: apenas configuração de endpoints existentes
- **Exemplo**: Action que chama API interna da empresa via OpenAPI spec

### Code Interpreter
- **Execução de código** gerado pelo modelo (Python, JS, etc.)
- **Serviço externo**: requer API separada (oficial ou custom como nosso gateway Piston)
- **Sandboxed**: execução isolada do servidor principal
- **File I/O**: suporta upload/download de arquivos nas sessões

### Vantagens
- Arquitetura distribuída (cada tool é um processo/serviço separado)
- Sandboxing real (isolamento de processos)
- MCP é um padrão da indústria com ecossistema crescente
- Escalável horizontalmente

### Limitações
- Não há editor de código inline na UI (requer deploy/config de servidores MCP)
- Curva de aprendizado maior para criar integrações custom
- Actions limitadas a APIs REST com OpenAPI spec

---

## Comparativo Direto

| Aspecto | OpenWebUI | LibreChat |
|---------|-----------|-----------|
| **Criar ferramenta** | Python na UI | MCP server externo ou Action OpenAPI |
| **Deploy de ferramenta** | Salvar na UI | Deploy do servidor MCP + config yaml |
| **Sandboxing** | Nenhum (mesmo processo) | Forte (processos separados) |
| **Linguagem** | Python apenas | Qualquer (MCP é agnóstico) |
| **Protocolo** | Proprietário | MCP (padrão aberto) |
| **Ecossistema** | Comunidade OpenWebUI | Ecossistema MCP global |
| **Edição ao vivo** | Sim | Não (requer restart/redeploy) |
| **Code Interpreter** | Built-in (sandbox Docker) | Serviço externo |
| **Pipelines/Middleware** | Sim (Python inline) | Não tem equivalente direto |

---

## Conclusão para o IAzzas

Para o contexto corporativo da Azzas 2154:

1. **MCP é a melhor aposta** — protocolo padronizado, seguro, e com ecossistema crescente
2. **Actions cobrem integrações REST** — APIs internas podem ser expostas via OpenAPI spec sem código
3. **Code Interpreter via Piston** — já implementado no nosso gateway custom
4. **Gap principal**: não há equivalente ao "Pipelines" do OpenWebUI para middleware de processamento de mensagens. Se precisarmos de PII masking ou transformações, isso precisaria ser implementado no backend ou via MCP server custom

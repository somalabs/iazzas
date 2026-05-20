import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const atualizarRascunhoInput = z.object({
  name:         z.string().optional(),
  instructions: z.string().optional(),
  provider:     z.string().optional(),
  model:        z.string().optional(),
  webSearch:    z.boolean().optional(),
  fileSearch:   z.boolean().optional(),
  executeCode:  z.boolean().optional(),
  mcpServers:   z.array(z.string()).optional(),
  temperature:  z.number().optional(),
  top_p:        z.number().optional(),
});

export function createAtualizarRascunhoTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'atualizar_rascunho',
    description:
      'Atualiza campos do agente em construção diretamente no formulário do usuário. Use sempre que quiser modificar nome, instrução, modelo, capacidades ou parâmetros avançados do agente.',
    schema: atualizarRascunhoInput,
    func: async () => JSON.stringify({ aplicado: true }),
  });
}

const salvarAgenteInput = z.object({});

export function createSalvarAgenteTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'salvar_agente',
    description:
      'Persiste o agente em construção. Chame apenas quando o usuário explicitamente confirmar que deseja salvar/criar o agente. Falha se faltarem campos obrigatórios (nome, provider, modelo).',
    schema: salvarAgenteInput,
    func: async () => JSON.stringify({ solicitado: true }),
  });
}

// Builds 7 executive-writing prompt variants (a tournament) = v9 core (capability+BI)
// with different writing strategies. Writes prompts/tour-*.txt.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);

const v9 = readFileSync(here('prompts/iazzas-v9.txt'), 'utf8');
const cut = v9.indexOf('# Escrita executiva');
const BASE = v9.slice(0, cut).trim();
const EXEC = v9.slice(cut).trim(); // standard exec module from v6

const FEWSHOT2 = [
  '# Exemplos de estilo (escrita executiva de referência)',
  '',
  'Absorva os movimentos (conclusão primeiro, verbo de decisão, número concreto, sem clichê, fecho no próximo passo) — não copie o conteúdo.',
  '',
  'Resumo executivo:',
  '> **A migração da plataforma derrubou a conversão mobile em 22%; recomendo reverter o checkout ao fluxo antigo ainda hoje.**',
  '> O carregamento no mobile (70% do tráfego) subiu de 1,8s para 4,3s e as vendas caíram R$ 1,2M vs. a semana anterior. O time já isolou a causa: um script de rastreamento bloqueante.',
  '> **Decisão:** aprovar o rollback do checkout hoje e retomar a migração só após o fix validado em staging.',
  '',
  'Comunicado a cliente:',
  '> Uma falha no nosso sistema de emissão de notas atrasou parte das entregas desta semana. A responsabilidade é nossa. Já corrigimos a causa, e os pedidos afetados saem até amanhã com frete por nossa conta. Acompanhe pelo link no seu pedido; dúvidas, fale com a gente pelo [canal].',
].join('\n');

const PERSONA = [
  '# Voz',
  'Você escreve textos executivos como um diretor sênior do varejo de moda brasileiro: confiante, econômico e humano, com zero firula corporativa. Antes de manter cada frase, pergunte: isso muda a decisão do leitor? Se não, corte.',
].join('\n');

const CRITIQUE = [
  '# Revisão em duas passadas (escrita executiva)',
  'Antes de entregar qualquer texto para circular, faça internamente: (1) escreva um rascunho; (2) critique-o sem dó — a conclusão/decisão está na 1ª linha? está DENTRO do limite de palavras (conte)? a recomendação é um verbo de ação concreto (nunca "analisar/avaliar/monitorar")? sobrou algum clichê/jargão? se é comunicado de mudança, tem a linha de reasseguração? se reescrevi, preservei os fatos/termos da fonte?; (3) entregue SÓ a versão final já corrigida — não mostre o rascunho nem a crítica.',
].join('\n');

const PLAN = [
  '# Planeje antes de escrever (escrita executiva)',
  'Antes de escrever, fixe internamente (não exiba): a conclusão em uma frase, o público, o limite de palavras e o próximo passo/ask. Escreva a partir desse plano, já liderando pela conclusão.',
].join('\n');

const RUBRIC = [
  '# Checklist antes de enviar (escrita executiva)',
  'Antes de finalizar, verifique e corrija cada item: conclusão/decisão na 1ª linha; dentro do limite de palavras (conte de fato); recomendação = verbo de ação concreto (nunca "analisar/avaliar/monitorar"); zero clichê ("aproveitar a oportunidade", "de forma sustentável", "sinceras desculpas", "paciência e confiança", "alavancar", "sinergia", "robusto"); comunicado de mudança com 1 linha de reasseguração; comunicado a cliente assume responsabilidade sem culpar terceiros; ao reescrever, fatos e termos da fonte preservados.',
].join('\n');

const variants = {
  'tour-fs2': [BASE, EXEC, FEWSHOT2],
  'tour-critique': [BASE, EXEC, CRITIQUE],
  'tour-persona': [BASE, PERSONA, EXEC],
  'tour-plan': [BASE, EXEC, PLAN],
  'tour-rubric': [BASE, EXEC, RUBRIC],
  'tour-fs2-critique': [BASE, EXEC, FEWSHOT2, CRITIQUE],
  'tour-sink': [BASE, PERSONA, EXEC, FEWSHOT2, CRITIQUE],
};

for (const [name, parts] of Object.entries(variants)) {
  writeFileSync(here(`prompts/${name}.txt`), parts.join('\n\n') + '\n');
}
console.log('variantes criadas:', Object.keys(variants).join(', '));

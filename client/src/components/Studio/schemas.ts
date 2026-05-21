import type { StudioUseCaseSchema } from 'librechat-data-provider';

export const USE_CASE_SCHEMAS: StudioUseCaseSchema[] = [
  {
    id: 'color_variants',
    displayName: 'Variantes de Cor',
    description: 'Mude o colorway da peça preservando silhueta, textura e construção.',
    defaultModel: 'flux-kontext',
    uiDefaults: { aspectRatio: '4:5', imageCount: 4, resolution: '2K' },
    imageSlots: [
      {
        id: 'product_image',
        label: 'Produto',
        description: 'Foto do produto a recolorir (uma foto, preferencialmente frontal e nítida).',
        required: true,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
      {
        id: 'color_reference',
        label: 'Cor de referência',
        description:
          'Imagem só para indicar a paleta ou colorway desejado (NÃO é um segundo produto). Opcional.',
        required: false,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
    ],
    formFields: [
      {
        id: 'target_colorway',
        type: 'text',
        label: 'Colorway desejado',
        placeholder: 'ex: dusty rose, cobalt blue / ivory, all-black',
        required: true,
        maxLength: 200,
      },
      {
        id: 'preserve_details',
        type: 'text',
        label: 'Detalhes a preservar',
        placeholder: 'ex: bordados, estampa original, rebites dourados',
        required: false,
        maxLength: 200,
      },
      {
        id: 'style_notes',
        type: 'text',
        label: 'Notas adicionais',
        placeholder: 'ex: manter fundo neutro de estúdio',
        required: false,
        maxLength: 300,
      },
    ],
  },
  {
    id: 'pattern_application',
    displayName: 'Aplicar Estampa',
    description: 'Aplique uma estampa ou arte na superfície da peça.',
    defaultModel: 'nano-banana-2',
    uiDefaults: { aspectRatio: '4:5', imageCount: 4, resolution: '2K' },
    imageSlots: [
      {
        id: 'product_image',
        label: 'Produto',
        description:
          'Peça que vai receber a estampa. Toque no + para adicionar mais ângulos da MESMA peça (frente, costas, detalhes) — ajuda a aplicar a arte de forma consistente.',
        required: true,
        multiple: true,
        maxCount: 4,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
      {
        id: 'pattern_image',
        label: 'Estampa',
        description:
          'A arte, motivo ou estampa que será aplicada na peça (NÃO uma foto de outro produto).',
        required: true,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
    ],
    formFields: [
      {
        id: 'application_type',
        type: 'select',
        label: 'Tipo de aplicação',
        required: true,
        default: 'all-over',
        options: [
          { value: 'all-over', label: 'All-over (cobre toda a superfície)' },
          { value: 'placement', label: 'Placement (motivo único posicionado)' },
          { value: 'panel', label: 'Panel (limitado a painéis do molde)' },
          { value: 'engineered', label: 'Engineered (projetado para o molde)' },
        ],
      },
      {
        id: 'scale',
        type: 'select',
        label: 'Escala da estampa',
        required: true,
        default: 'medium',
        options: [
          { value: 'small', label: 'Pequena' },
          { value: 'medium', label: 'Média' },
          { value: 'large', label: 'Grande' },
          { value: 'extra-large', label: 'Extra-grande' },
        ],
      },
      {
        id: 'intensity',
        type: 'toggle',
        label: 'Intensidade',
        required: true,
        default: 'subtle',
        options: [
          { value: 'subtle', label: 'Sutil' },
          { value: 'full', label: 'Full' },
        ],
      },
      {
        id: 'preserve_structure',
        type: 'boolean',
        label: 'Preservar estrutura da peça',
        description: 'Manter costuras, recortes e volumetria visíveis',
        required: false,
        default: true,
      },
      {
        id: 'color_adaptation',
        type: 'toggle',
        label: 'Cores da estampa',
        required: true,
        default: 'use-pattern-colors',
        options: [
          { value: 'use-pattern-colors', label: 'Cores originais' },
          { value: 'adapt-to-garment', label: 'Adaptar à peça' },
        ],
      },
    ],
  },
  {
    id: 'virtual_tryon',
    displayName: 'Produto em Modelo',
    description: 'Exiba uma peça sendo usada por uma modelo.',
    defaultModel: 'nano-banana-pro',
    uiDefaults: { aspectRatio: '2:3', imageCount: 4, resolution: '2K' },
    compliance: {
      requiresHumanReview: true,
      reviewReason:
        'Likeness e fidelidade da peça requerem aprovação humana antes do uso comercial',
    },
    imageSlots: [
      {
        id: 'garment_image',
        label: 'Peças do look',
        description:
          'Cada foto é uma peça DIFERENTE para vestir o modelo no mesmo look (ex: blusa + calça + acessório). Toque no + para adicionar outra peça.',
        required: true,
        multiple: true,
        maxCount: 5,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
      {
        id: 'model_reference',
        label: 'Modelo',
        description:
          'Foto de uma pessoa só para indicar quem veste o look (consistência de modelo). NÃO é uma peça do look. Opcional.',
        required: false,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
    ],
    formFields: [
      {
        id: 'pose',
        type: 'select',
        label: 'Pose',
        required: true,
        default: 'front',
        options: [
          { value: 'front', label: 'Frontal' },
          { value: 'three-quarter', label: 'Três quartos' },
          { value: 'side', label: 'Lateral' },
          { value: 'walking', label: 'Andando' },
          { value: 'sitting', label: 'Sentado/a' },
        ],
      },
      {
        id: 'setting',
        type: 'select',
        label: 'Cenário',
        required: true,
        default: 'studio-white',
        options: [
          { value: 'studio-white', label: 'Estúdio fundo branco' },
          { value: 'store', label: 'Loja / varejo' },
          { value: 'outdoor', label: 'Externo' },
          { value: 'editorial', label: 'Editorial' },
        ],
      },
      {
        id: 'styling_notes',
        type: 'text',
        label: 'Notas de styling',
        placeholder: 'ex: adicionar cinto, sapatos neutros, cabelo solto',
        required: false,
        maxLength: 300,
      },
    ],
  },
  {
    id: 'multi_reference',
    displayName: 'Múltiplas Referências',
    description:
      'Crie composições a partir de múltiplas referências de estilo, peças ou personagem.',
    defaultModel: 'nano-banana-pro',
    uiDefaults: { aspectRatio: '4:5', imageCount: 4, resolution: '2K' },
    compliance: {
      requiresHumanReview: true,
      reviewReason:
        'Composições multi-referência de assets de marca requerem aprovação antes do uso comercial',
    },
    imageSlots: [
      {
        id: 'style_reference',
        label: 'Referência de estilo',
        description: 'Imagem principal de mood, cenário ou composição',
        required: true,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
      {
        id: 'garment_references',
        label: 'Peças / Produtos',
        description: 'Roupas e produtos a incluir (até 11 imagens)',
        required: false,
        multiple: true,
        maxCount: 11,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
      {
        id: 'character_reference',
        label: 'Referência de modelo',
        description: 'Para manter consistência de modelo ou personagem (opcional)',
        required: false,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
    ],
    formFields: [
      {
        id: 'primary_intent',
        type: 'select',
        label: 'Intenção',
        required: true,
        default: 'mix-elements',
        options: [
          { value: 'mix-elements', label: 'Combinar elementos das referências' },
          { value: 'recreate-colorway', label: 'Recriar em novo colorway' },
          { value: 'lookbook-display', label: 'Exibição tipo lookbook / araras' },
          { value: 'editorial-composition', label: 'Composição editorial' },
        ],
      },
      {
        id: 'output_format',
        type: 'select',
        label: 'Formato de saída',
        required: true,
        default: 'on-model',
        options: [
          { value: 'on-model', label: 'Em modelo' },
          { value: 'flat-lay', label: 'Flat lay' },
          { value: 'on-hanger', label: 'Em cabide / arara' },
          { value: 'product-still', label: 'Still de produto' },
        ],
      },
      {
        id: 'creative_direction',
        type: 'textarea',
        label: 'Direção criativa',
        placeholder:
          'ex: manter bordados maximalistas, paleta terrosa, inserir todas as peças no expositor',
        required: false,
        maxLength: 500,
      },
    ],
  },
  {
    id: 'sketch_to_render',
    displayName: 'Sketch-to-Render',
    description: 'Converta um sketch, flat ou CAD em um render fotorrealista ou editorial.',
    defaultModel: 'nano-banana-pro',
    uiDefaults: { aspectRatio: '4:5', imageCount: 4, resolution: '2K' },
    imageSlots: [
      {
        id: 'sketch_image',
        label: 'Sketch / Flat',
        description:
          'Desenho, flat técnico ou CAD da peça. Toque no + para adicionar mais vistas do MESMO desenho (frente, costas, lateral, detalhes).',
        required: true,
        multiple: true,
        maxCount: 4,
        accepts: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      },
      {
        id: 'style_reference',
        label: 'Mood / estilo',
        description:
          'Imagem só para indicar mood, iluminação ou direção visual do render (NÃO é outra peça). Opcional.',
        required: false,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
    ],
    formFields: [
      {
        id: 'render_style',
        type: 'select',
        label: 'Estilo do render',
        required: true,
        default: 'photorealistic',
        options: [
          { value: 'photorealistic', label: 'Fotorrealista (e-commerce / produto)' },
          { value: 'editorial', label: 'Editorial (alta moda)' },
          { value: 'illustration', label: 'Ilustração técnica' },
        ],
      },
      {
        id: 'fabric_type',
        type: 'text',
        label: 'Tecido / Material',
        placeholder: 'ex: silk chiffon, heavy cotton canvas, boucle, leather',
        required: false,
        maxLength: 150,
      },
      {
        id: 'colorway',
        type: 'text',
        label: 'Colorway',
        placeholder: 'ex: ivory / dusty rose, all-black',
        required: false,
        maxLength: 150,
      },
      {
        id: 'setting',
        type: 'select',
        label: 'Cenário',
        required: true,
        default: 'studio-white',
        options: [
          { value: 'studio-white', label: 'Estúdio fundo branco' },
          { value: 'editorial-environment', label: 'Ambiente editorial' },
        ],
      },
    ],
  },
  {
    id: 'render_to_sketch',
    displayName: 'Foto → Desenho Técnico',
    description:
      'A partir de uma foto de produto, gere um desenho técnico de moda (flat/CAD) como ponto de partida para desenvolvimento.',
    defaultModel: 'nano-banana-pro',
    uiDefaults: { aspectRatio: '4:5', imageCount: 2, resolution: '2K' },
    imageSlots: [
      {
        id: 'product_image',
        label: 'Foto do produto',
        description:
          'Foto real do produto, preferencialmente de frente. Toque no + para adicionar mais ângulos do MESMO produto (costas, lateral, close de detalhes) — quanto mais ângulos, mais preciso o desenho técnico.',
        required: true,
        multiple: true,
        maxCount: 5,
        accepts: ['jpg', 'jpeg', 'png', 'webp'],
      },
    ],
    formFields: [
      {
        id: 'sketch_style',
        type: 'select',
        label: 'Estilo do desenho',
        required: true,
        default: 'technical-flat',
        options: [
          { value: 'technical-flat', label: 'Flat técnico (linha limpa, frente + costas)' },
          { value: 'cad-spec', label: 'CAD / Spec sheet (linhas precisas, sem sombreamento)' },
          { value: 'fashion-illustration', label: 'Croqui de moda (ilustração estilizada)' },
        ],
      },
      {
        id: 'views',
        type: 'select',
        label: 'Vistas',
        required: true,
        default: 'front-back',
        options: [
          { value: 'front-only', label: 'Apenas frente' },
          { value: 'front-back', label: 'Frente e costas' },
          { value: 'front-back-side', label: 'Frente, costas e lateral' },
        ],
      },
      {
        id: 'line_weight',
        type: 'toggle',
        label: 'Traço',
        required: true,
        default: 'medium',
        options: [
          { value: 'thin', label: 'Fino' },
          { value: 'medium', label: 'Médio' },
        ],
      },
      {
        id: 'include_stitching',
        type: 'boolean',
        label: 'Mostrar costuras e pespontos',
        description: 'Desenhar linhas de costura, pespontos e detalhes construtivos',
        required: false,
        default: true,
      },
      {
        id: 'background',
        type: 'toggle',
        label: 'Fundo',
        required: true,
        default: 'white',
        options: [
          { value: 'white', label: 'Branco' },
          { value: 'transparent', label: 'Transparente' },
        ],
      },
      {
        id: 'notes',
        type: 'text',
        label: 'Observações',
        placeholder: 'ex: destacar zíper frontal, cós elástico, bolsos chapados',
        required: false,
        maxLength: 300,
      },
    ],
  },
];

export const ASPECT_RATIO_OPTIONS = [
  { value: '1:1' as const, label: 'Square' },
  { value: '16:9' as const, label: 'Widescreen' },
  { value: '9:16' as const, label: 'Social story' },
  { value: '2:3' as const, label: 'Portrait' },
  { value: '3:4' as const, label: 'Traditional' },
  { value: '1:2' as const, label: 'Vertical' },
  { value: '2:1' as const, label: 'Horizontal' },
  { value: '4:5' as const, label: 'Social post' },
  { value: '3:2' as const, label: 'Standard' },
  { value: '4:3' as const, label: 'Classic' },
];

export const RESOLUTION_OPTIONS = ['1K', '2K', '4K'] as const;

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'flux-kontext': 'Flux Kontext',
  'nano-banana-2': 'Google Nano Banana 2',
  'nano-banana-pro': 'Google Nano Banana Pro',
};

/**
 * A use case has required inputs when it declares a required image slot or a
 * required form field. Retry re-sends the persisted creation with empty
 * formValues/references, so retrying such a use case would fail validation
 * server-side — the UI disables Retry for these and tells the user to redo
 * the form instead.
 */
export function useCaseHasRequiredInputs(useCaseId: string): boolean {
  const schema = USE_CASE_SCHEMAS.find((s) => s.id === useCaseId);
  if (!schema) return false;
  return (
    schema.imageSlots.some((slot) => slot.required) ||
    schema.formFields.some((field) => field.required)
  );
}

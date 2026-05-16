import type { UseCaseSchema } from '../types';

export const USE_CASE_SCHEMAS: UseCaseSchema[] = [
  {
    id: 'product',
    label: 'Product',
    description: 'Isolate and highlight a fashion piece',
    fields: [
      { key: 'item', label: 'Item description', type: 'text', placeholder: 'e.g. Black leather jacket, size M', required: true },
      { key: 'background', label: 'Background', type: 'select', options: ['White', 'Off-white', 'Light grey', 'Black', 'Custom'] },
      { key: 'lighting', label: 'Lighting', type: 'select', options: ['Flat', 'Soft studio', 'Dramatic', 'Natural'] },
    ],
  },
  {
    id: 'lookbook',
    label: 'Lookbook',
    description: 'Styled shoot in sequence, clean light',
    fields: [
      { key: 'look', label: 'Look / outfit', type: 'textarea', placeholder: 'Describe the full look', required: true },
      { key: 'setting', label: 'Setting', type: 'text', placeholder: 'e.g. Minimalist studio, São Paulo rooftop' },
      { key: 'mood', label: 'Mood', type: 'select', options: ['Clean', 'Romantic', 'Urban', 'Avant-garde'] },
    ],
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Magazine-grade image with narrative',
    fields: [
      { key: 'concept', label: 'Concept / story', type: 'textarea', placeholder: 'Describe the editorial concept', required: true },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Abandoned factory, beach at dusk' },
      { key: 'lighting', label: 'Lighting', type: 'select', options: ['Golden hour', 'Blue hour', 'Harsh midday', 'Low-key studio', 'Natural soft'] },
      { key: 'mood', label: 'Mood', type: 'select', options: ['Dramatic', 'Dreamy', 'Gritty', 'Sensual', 'Playful'] },
    ],
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    description: 'Conversion-ready product image',
    fields: [
      { key: 'item', label: 'Product', type: 'text', placeholder: 'e.g. Floral midi dress, white', required: true },
      { key: 'angle', label: 'Angle', type: 'select', options: ['Front', 'Back', 'Side', '¾ front', 'Flat lay', 'Detail'] },
      { key: 'background', label: 'Background', type: 'select', options: ['Pure white', 'Off-white', 'Light grey'] },
    ],
  },
  {
    id: 'concept',
    label: 'Concept',
    description: 'Sketch or moodboard for design exploration',
    fields: [
      { key: 'inspiration', label: 'Inspiration / direction', type: 'textarea', placeholder: 'Describe the design concept', required: true },
      { key: 'style', label: 'Visual style', type: 'select', options: ['Sketch', 'Watercolor', 'Digital render', 'Collage', 'Mixed media'] },
      { key: 'palette', label: 'Color palette', type: 'text', placeholder: 'e.g. Earthy tones, navy + cream' },
    ],
  },
];

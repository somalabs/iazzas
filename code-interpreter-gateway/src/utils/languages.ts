interface PistonLanguage {
  language: string;
  version: string;
}

const languageMap: Record<string, PistonLanguage> = {
  py: { language: 'python', version: '3' },
  js: { language: 'javascript', version: '*' },
  ts: { language: 'typescript', version: '*' },
  c: { language: 'c', version: '*' },
  cpp: { language: 'c++', version: '*' },
  java: { language: 'java', version: '*' },
  php: { language: 'php', version: '*' },
  rs: { language: 'rust', version: '*' },
  go: { language: 'go', version: '*' },
  r: { language: 'r', version: '*' },
  bash: { language: 'bash', version: '*' },
  d: { language: 'd', version: '*' },
  f90: { language: 'fortran', version: '*' },
};

export function mapLanguage(lang: string): PistonLanguage {
  const mapped = languageMap[lang];
  if (!mapped) {
    throw new Error(`Unsupported language: ${lang}`);
  }
  return mapped;
}

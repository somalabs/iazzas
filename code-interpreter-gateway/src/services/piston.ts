import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { mapLanguage } from '../utils/languages';
import { getOrCreateSession, getSessionFiles, getFile, addFile } from './session';

const PISTON_URL = process.env.PISTON_URL ?? 'http://localhost:2000';
const EXEC_TIMEOUT_MS = parseInt(process.env.EXEC_TIMEOUT_MS ?? '30000', 10);
const USE_LOCAL_EXEC = process.env.USE_LOCAL_EXEC === 'true';

interface PistonFile {
  content: string;
  name?: string;
  encoding?: 'utf8' | 'base64';
}

interface PistonResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    output: string;
  };
}

interface ExecRequest {
  lang: string;
  code: string;
  args?: string[];
  files?: Array<{ id: string; name: string; session_id: string }>;
  session_id?: string;
}

interface ExecResponse {
  session_id: string;
  stdout: string;
  stderr: string;
  files: Array<{ id: string; name: string }>;
}

function executeLocal(req: ExecRequest): ExecResponse {
  const session = getOrCreateSession(req.session_id);
  const tmpDir = '/mnt/data';
  mkdirSync(tmpDir, { recursive: true });

  const ext = getFileExtension(req.lang);
  const filename = `main${ext}`;
  writeFileSync(join(tmpDir, filename), req.code);

  const existingFiles = getSessionFiles(session.id);
  for (const f of existingFiles) {
    writeFileSync(join(tmpDir, f.name), f.content);
  }

  if (Array.isArray(req.files)) {
    for (const injected of req.files) {
      const file = getFile(injected.session_id, injected.id);
      if (file) {
        writeFileSync(join(tmpDir, injected.name), file.content);
      }
    }
  }

  const commands: Record<string, string> = {
    py: `python3 ${filename}`,
    js: `node ${filename}`,
    ts: `npx tsx ${filename}`,
    bash: `bash ${filename}`,
    go: `go run ${filename}`,
    r: `Rscript ${filename}`,
  };

  const cmd = commands[req.lang];
  if (!cmd) {
    return { session_id: session.id, stdout: '', stderr: `Unsupported language for local exec: ${req.lang}`, files: [] };
  }

  let stdout = '';
  let stderr = '';

  try {
    const result = execSync(cmd, {
      cwd: tmpDir,
      timeout: EXEC_TIMEOUT_MS,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    stdout = result;
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    stdout = execErr.stdout ?? '';
    stderr = execErr.stderr ?? execErr.message ?? 'Execution failed';
  }

  const outputFiles = parseFileOutputs(stdout, session.id);
  return { session_id: session.id, stdout, stderr, files: outputFiles };
}

async function executePiston(req: ExecRequest): Promise<ExecResponse> {
  const { language, version } = mapLanguage(req.lang);
  const session = getOrCreateSession(req.session_id);

  const pistonFiles: PistonFile[] = [];

  const existingFiles = getSessionFiles(session.id);
  for (const f of existingFiles) {
    pistonFiles.push({
      name: f.name,
      content: f.content.toString('base64'),
      encoding: 'base64',
    });
  }

  const ext = getFileExtension(req.lang);
  pistonFiles.push({ name: `main${ext}`, content: req.code });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXEC_TIMEOUT_MS);

  try {
    const response = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        version,
        files: pistonFiles,
        args: req.args ?? [],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Piston error (${response.status}): ${error}`);
    }

    const result = (await response.json()) as PistonResponse;

    let stdout = '';
    let stderr = '';

    if (result.compile) {
      if (result.compile.stderr) {
        stderr += result.compile.stderr;
      }
    }

    stdout += result.run.stdout;
    stderr += result.run.stderr;

    const outputFiles = parseFileOutputs(stdout, session.id);

    return {
      session_id: session.id,
      stdout,
      stderr,
      files: outputFiles,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeCode(req: ExecRequest): Promise<ExecResponse> {
  if (USE_LOCAL_EXEC) {
    return executeLocal(req);
  }
  return executePiston(req);
}

function getFileExtension(lang: string): string {
  const extensions: Record<string, string> = {
    py: '.py',
    js: '.js',
    ts: '.ts',
    c: '.c',
    cpp: '.cpp',
    java: '.java',
    php: '.php',
    rs: '.rs',
    go: '.go',
    r: '.r',
    bash: '.sh',
    d: '.d',
    f90: '.f90',
  };
  return extensions[lang] ?? '';
}

function parseFileOutputs(
  stdout: string,
  sessionId: string,
): Array<{ id: string; name: string }> {
  const fileRefs: Array<{ id: string; name: string }> = [];

  const fileMarkerRegex = /\[FILE_OUTPUT:([^\]]+)\]\n([\s\S]*?)\[\/FILE_OUTPUT\]/g;
  let match;
  while ((match = fileMarkerRegex.exec(stdout)) !== null) {
    const filename = match[1];
    const content = Buffer.from(match[2], 'base64');
    const file = addFile(sessionId, filename, content);
    fileRefs.push({ id: file.id, name: file.name });
  }

  return fileRefs;
}

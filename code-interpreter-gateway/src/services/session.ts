import { v4 as uuidv4 } from 'uuid';

export interface SessionFile {
  id: string;
  name: string;
  content: Buffer;
  createdAt: number;
}

interface Session {
  id: string;
  files: Map<string, SessionFile>;
  createdAt: number;
}

const sessions = new Map<string, Session>();
const SESSION_TTL_MS = (parseInt(process.env.SESSION_TTL_HOURS ?? '24', 10)) * 60 * 60 * 1000;

function cleanup(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

setInterval(cleanup, 60 * 60 * 1000);

export function getOrCreateSession(sessionId?: string): Session {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }
  const id = sessionId ?? uuidv4();
  const session: Session = { id, files: new Map(), createdAt: Date.now() };
  sessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function addFile(sessionId: string, name: string, content: Buffer): SessionFile {
  const session = getOrCreateSession(sessionId);
  const file: SessionFile = {
    id: uuidv4(),
    name,
    content,
    createdAt: Date.now(),
  };
  session.files.set(file.id, file);
  return file;
}

export function getFile(sessionId: string, fileId: string): SessionFile | undefined {
  return sessions.get(sessionId)?.files.get(fileId);
}

export function getSessionFiles(sessionId: string): SessionFile[] {
  const session = sessions.get(sessionId);
  if (!session) return [];
  return Array.from(session.files.values());
}

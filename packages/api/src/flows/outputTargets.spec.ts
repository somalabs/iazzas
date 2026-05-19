import {
  publishOutputTargets,
  scrubReason,
  formatInTimezone,
  type OutputTargetDeps,
} from './outputTargets';

function makeDeps() {
  const conversation: Array<{ userId: string; title: string; text: string }> = [];
  const notifications: Array<{ title: string; body: string; link: string }> = [];
  const warnings: string[] = [];
  const deps: OutputTargetDeps = {
    createConversation: async (p) => {
      conversation.push(p);
    },
    notify: async (p) => {
      notifications.push(p);
    },
    logger: { warn: (m) => warnings.push(m) },
  };
  return { deps, conversation, notifications, warnings };
}

describe('flows/outputTargets', () => {
  describe('scrubReason', () => {
    it('strips control chars and truncates', () => {
      expect(scrubReason('a\x00b\nc')).toBe('a b c');
      expect(scrubReason(undefined)).toBe('Erro desconhecido');
      expect(scrubReason('x'.repeat(500)).length).toBeLessThanOrEqual(200);
    });
  });

  describe('formatInTimezone', () => {
    it('formats DD/MM/YYYY HH:mm in the given timezone', () => {
      const d = new Date('2026-05-18T12:00:00.000Z'); // 09:00 in America/Sao_Paulo
      expect(formatInTimezone(d, 'America/Sao_Paulo')).toBe('18/05/2026 09:00');
    });
  });

  it('creates a conversation and notification on success', async () => {
    const { deps, conversation, notifications } = makeDeps();
    await publishOutputTargets(
      {
        userId: 'u1',
        automationId: 'a1',
        runId: 'r1',
        flowName: 'Relatório',
        timezone: 'America/Sao_Paulo',
        status: 'success',
        output: 'resultado final',
        now: new Date('2026-05-18T12:00:00.000Z'),
      },
      deps,
    );
    expect(conversation[0].title).toBe('Relatório — 18/05/2026 09:00');
    expect(conversation[0].text).toBe('resultado final');
    expect(notifications[0].title).toBe('Relatório: execução concluída');
    expect(notifications[0].link).toBe('/d/automacoes/a1/runs/r1');
  });

  it('uses a scrubbed failure message on failure', async () => {
    const { deps, conversation, notifications } = makeDeps();
    await publishOutputTargets(
      {
        userId: 'u1',
        automationId: 'a1',
        runId: 'r1',
        flowName: 'F',
        timezone: 'America/Sao_Paulo',
        status: 'failed',
        errorReason: 'agent_runtime_error',
      },
      deps,
    );
    expect(conversation[0].text).toContain('Execução falhou: agent_runtime_error');
    expect(notifications[0].title).toBe('F: execução falhou');
  });

  it('does not throw and logs scrubbed warning when a target fails (best-effort)', async () => {
    const { deps, warnings, notifications } = makeDeps();
    deps.createConversation = async () => {
      throw new Error('db down secret-token');
    };
    await expect(
      publishOutputTargets(
        {
          userId: 'u1',
          automationId: 'a1',
          runId: 'r1',
          flowName: 'F',
          timezone: 'UTC',
          status: 'success',
          output: 'ok',
        },
        deps,
      ),
    ).resolves.toBeUndefined();
    expect(warnings.some((w) => w.includes('conversation target failed'))).toBe(true);
    expect(warnings.join()).not.toContain('secret-token');
    // notification still attempted despite conversation failure
    expect(notifications).toHaveLength(1);
  });
});

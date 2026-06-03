jest.mock('~/server/services/PermissionService', () => ({
  findPubliclyAccessibleResources: jest.fn(),
  getResourcePermissionsMap: jest.fn(),
  findAccessibleResources: jest.fn(),
  hasPublicPermission: jest.fn(),
  grantPermission: jest.fn().mockResolvedValue({}),
}));

jest.mock('~/server/services/Config', () => ({
  getCachedTools: jest.fn().mockResolvedValue({}),
  getMCPServerTools: jest.fn(),
}));

jest.mock('~/server/services/MCP', () => ({
  resolveConfigServers: jest.fn().mockResolvedValue([]),
}));

jest.mock('~/server/services/Files/strategies', () => ({
  getStrategyFunctions: jest.fn(),
}));

jest.mock('~/server/services/Files/images/avatar', () => ({
  resizeAvatar: jest.fn(),
}));

jest.mock('~/server/utils/getFileStrategy', () => ({
  getFileStrategy: jest.fn(),
}));

jest.mock('~/server/services/Files/process', () => ({
  filterFile: jest.fn(),
}));

jest.mock('~/config', () => ({
  getMCPServersRegistry: jest.fn().mockResolvedValue({}),
}));

jest.mock('~/cache', () => ({
  getLogStores: jest.fn(),
}));

jest.mock('~/models');

const { updateAgent: updateAgentHandler } = require('../v1');
const db = require('~/models');

describe('updateAgentHandler avatar icon', () => {
  function buildReqRes(body) {
    const req = {
      params: { id: 'agent_test' },
      user: { id: 'user_1', role: 'USER' },
      body,
      app: { locals: {} },
    };
    const res = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    return { req, res };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes an icon-shaped avatar through to updateAgent', async () => {
    const existingAgent = { id: 'agent_test', author: 'user_1', tools: [], versions: [] };
    const iconAvatar = { source: 'icon', icon: 'sparkles', iconColor: '#274566' };

    db.getAgent.mockResolvedValue(existingAgent);
    db.updateAgent.mockImplementation(async (_query, data) => ({
      id: 'agent_test',
      author: 'user_1',
      versions: [],
      ...data,
    }));

    const { req, res } = buildReqRes({ avatar: iconAvatar });
    await updateAgentHandler(req, res);

    expect(db.updateAgent).toHaveBeenCalled();
    const [, data] = db.updateAgent.mock.calls[0];
    expect(data.avatar).toEqual(iconAvatar);
  });
});

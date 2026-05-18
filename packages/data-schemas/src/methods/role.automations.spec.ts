import mongoose from 'mongoose';
import { PermissionTypes, Permissions, SystemRoles } from 'librechat-data-provider';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '~/models';
import { createMethods } from '~/methods';

/**
 * Regression for LEM-48 (recurrence of the LEM-38 defect class): the Mongoose
 * `rolePermissionsSchema` must declare `PermissionTypes.AUTOMATIONS`. When it is
 * omitted, Mongoose (`strict: true`, `{ _id: false }`) silently strips the path
 * on `role.save()` during `initializeRoles()`, so seeded ADMIN/USER docs lose
 * AUTOMATIONS and every `/api/automacoes` request 403s.
 */
describe('Role schema — AUTOMATIONS permission persistence', () => {
  let mongoServer: MongoMemoryServer;
  let modelsToCleanup: string[] = [];
  let initializeRoles: () => Promise<void>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const models = createModels(mongoose);
    modelsToCleanup = Object.keys(models);
    Object.assign(mongoose.models, models);

    initializeRoles = createMethods(mongoose).initializeRoles;
  });

  afterAll(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    for (const modelName of modelsToCleanup) {
      delete mongoose.models[modelName];
    }
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('survives an explicit Role.save() (not stripped by Mongoose strict mode)', async () => {
    const Role = mongoose.models.Role;
    const role = new Role({
      name: 'lem48-explicit',
      permissions: {
        [PermissionTypes.AUTOMATIONS]: {
          [Permissions.USE]: true,
          [Permissions.CREATE]: true,
        },
      },
    });
    await role.save();

    const reloaded = await Role.findOne({ name: 'lem48-explicit' }).lean();
    expect(reloaded?.permissions?.[PermissionTypes.AUTOMATIONS]).toEqual({
      [Permissions.USE]: true,
      [Permissions.CREATE]: true,
    });
  });

  it('seeds AUTOMATIONS on fresh ADMIN and USER roles via initializeRoles', async () => {
    await initializeRoles();
    const Role = mongoose.models.Role;

    for (const roleName of [SystemRoles.ADMIN, SystemRoles.USER]) {
      const role = await Role.findOne({ name: roleName }).lean();
      expect(role?.permissions?.[PermissionTypes.AUTOMATIONS]).toEqual({
        [Permissions.USE]: true,
        [Permissions.CREATE]: true,
      });
    }
  });
});

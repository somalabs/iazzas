const { logger } = require('@librechat/data-schemas');
const { FileContext } = require('librechat-data-provider');
const {
  StudioGenerationService,
  createStudioAdapters,
  AdapterCapabilityError,
  AdapterRequestError,
  TemplateInputError,
} = require('@librechat/api');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const { saveBase64Image } = require('~/server/services/Files/process');
const { getFiles } = require('~/models');
const { StudioCreation } = require('~/db/models');

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

const buildReferenceResolver = (req) => async (fileId) => {
  const [file] = await getFiles({ user: req.user.id, file_id: fileId }, {}, {});
  if (!file) {
    throw new AdapterCapabilityError('nano-banana-pro', `Reference file not found: ${fileId}`);
  }
  const { getDownloadStream } = getStrategyFunctions(file.source);
  const stream = await getDownloadStream(req, file.filepath);
  const buffer = await streamToBuffer(stream);
  return { base64: buffer.toString('base64'), mimeType: file.type || 'image/png' };
};

const buildImagePersister = (req) => async ({ base64, mimeType, filename }) => {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const saved = await saveBase64Image(dataUrl, {
    req,
    filename,
    context: FileContext.image_generation,
  });
  return {
    id: saved.file_id,
    url: saved.filepath,
    thumbnailUrl: saved.filepath,
  };
};

const toRecord = (doc) => ({
  id: String(doc._id),
  prompt: doc.prompt,
  useCase: doc.useCase,
  model: doc.model,
  aspectRatio: doc.aspectRatio,
  resolution: doc.resolution,
  imageCount: doc.imageCount,
  createdAt: doc.createdAt,
  images: (doc.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    thumbnailUrl: img.thumbnailUrl,
  })),
  referenceCount: doc.referenceCount,
  collectionName: doc.collectionName ?? null,
  status: doc.status,
});

const buildRepository = (req) => ({
  async create(draft) {
    const doc = await StudioCreation.create({
      userId: req.user.id,
      useCase: draft.useCase,
      prompt: draft.prompt,
      model: draft.model,
      aspectRatio: draft.aspectRatio,
      resolution: draft.resolution,
      imageCount: draft.imageCount,
      images: draft.images,
      referenceCount: draft.referenceCount,
      status: draft.status,
      routerReason: draft.routerReason,
      provenance: draft.provenance,
      parentCreationId: draft.parentCreationId ?? null,
    });
    return { ...toRecord(doc), userId: req.user.id };
  },
  async findById(id) {
    const doc = await StudioCreation.findOne({ _id: id, userId: req.user.id }).lean();
    if (!doc) {
      return null;
    }
    return { ...toRecord(doc), userId: String(doc.userId), model: doc.model };
  },
  async list({ cursor, limit }) {
    const query = { userId: req.user.id };
    if (cursor) {
      query._id = { $lt: cursor };
    }
    const docs = await StudioCreation.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = docs.length > limit;
    const items = docs.slice(0, limit).map(toRecord);
    const nextCursor = hasMore ? String(docs[limit - 1]._id) : null;
    return { items, nextCursor };
  },
});

const buildService = (req) =>
  new StudioGenerationService({
    adapters: createStudioAdapters(),
    resolveReference: buildReferenceResolver(req),
    persistImage: buildImagePersister(req),
    repository: buildRepository(req),
    audit: (event) =>
      logger.info(
        `[studio] ${event.type} user=${event.userId} model=${event.model} ` +
          `useCase=${event.useCase} refs=${event.referenceCount} reason="${event.routerReason}"`,
      ),
  });

const handleError = (res, err) => {
  if (err instanceof TemplateInputError || err instanceof AdapterCapabilityError) {
    return res.status(422).json({ error: err.message });
  }
  if (err instanceof AdapterRequestError) {
    return res.status(502).json({ error: err.message });
  }
  logger.error('[studio] unexpected error', err);
  return res.status(500).json({ error: 'Studio generation failed' });
};

const generate = async (req, res) => {
  try {
    const creation = await buildService(req).generate(req.user.id, req.body);
    res.status(201).json(creation);
  } catch (err) {
    handleError(res, err);
  }
};

const edit = async (req, res) => {
  try {
    const creation = await buildService(req).edit(req.user.id, req.body);
    res.status(201).json(creation);
  } catch (err) {
    handleError(res, err);
  }
};

const getCreation = async (req, res) => {
  try {
    const doc = await StudioCreation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Creation not found' });
    }
    res.json(toRecord(doc));
  } catch (err) {
    handleError(res, err);
  }
};

const listCreations = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const result = await buildRepository(req).list({
      cursor: req.query.cursor || null,
      limit,
    });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = { generate, edit, getCreation, listCreations };

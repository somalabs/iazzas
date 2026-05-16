const { logger } = require('@librechat/data-schemas');
const { FileContext } = require('librechat-data-provider');
const {
  ImageGenerationService,
  createImageAdapters,
  AdapterRequestError,
  AdapterCapabilityError,
  MissingTemplateInputError,
} = require('@librechat/api');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const { saveBase64Image } = require('~/server/services/Files/process');
const { ImageGeneration } = require('~/db/models');
const { getFiles } = require('~/models');

/**
 * Thin `/api` glue for the fashion image-generation service. All orchestration
 * lives in `@librechat/api` (`packages/api/src/images`); this file only wires
 * concrete file storage + persistence collaborators and translates HTTP.
 */

function toRecord(doc) {
  return {
    _id: String(doc._id),
    useCase: doc.useCase,
    prompt: doc.prompt,
    referenceFileIds: doc.referenceFileIds ?? [],
    model: doc.model,
    overridden: doc.overridden ?? false,
    routerReason: doc.routerReason ?? '',
    params: {
      numImages: doc.params?.numImages,
      aspectRatio: doc.params?.aspectRatio,
      resolution: doc.params?.resolution,
    },
    outputFileIds: doc.outputFileIds ?? [],
    parentGenerationId: doc.parentGenerationId ? String(doc.parentGenerationId) : undefined,
    createdAt: doc.createdAt,
  };
}

function buildService(req) {
  const resolveReference = async (userId, fileId) => {
    const [file] = await getFiles({ user: userId, file_id: fileId }, {}, {});
    if (!file) {
      throw new AdapterCapabilityError(`Reference file ${fileId} not found.`);
    }
    const { getDownloadStream } = getStrategyFunctions(file.source);
    const stream = await getDownloadStream(req, file.filepath);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return {
      base64: Buffer.concat(chunks).toString('base64'),
      mimeType: file.type || 'image/png',
    };
  };

  const persistImage = async ({ image, index }) => {
    const dataUrl = `data:${image.mimeType};base64,${image.base64}`;
    const saved = await saveBase64Image(dataUrl, {
      req,
      filename: `gen-${Date.now()}-${index}.png`,
      endpoint: req.body?.endpoint,
      context: FileContext.image_generation,
    });
    return saved.file_id;
  };

  const repository = {
    async create(input) {
      const doc = await ImageGeneration.create(input);
      return toRecord(doc);
    },
    async findById(userId, id) {
      const doc = await ImageGeneration.findOne({ _id: id, user: userId }).lean();
      return doc ? toRecord(doc) : null;
    },
    async findByOutputFileId(userId, fileId) {
      const doc = await ImageGeneration.findOne({ user: userId, outputFileIds: fileId })
        .sort({ _id: -1 })
        .lean();
      return doc ? toRecord(doc) : null;
    },
    async list(userId, limit, cursor) {
      const query = { user: userId };
      if (cursor) {
        query._id = { $lt: cursor };
      }
      const docs = await ImageGeneration.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean();
      const hasMore = docs.length > limit;
      const page = hasMore ? docs.slice(0, limit) : docs;
      return {
        records: page.map(toRecord),
        nextCursor: hasMore ? String(page[page.length - 1]._id) : null,
      };
    },
  };

  return new ImageGenerationService({
    adapters: createImageAdapters(),
    resolveReference,
    persistImage,
    repository,
  });
}

function handleError(res, error) {
  if (error instanceof MissingTemplateInputError || error instanceof AdapterCapabilityError) {
    return res.status(422).json({ message: error.message });
  }
  if (error instanceof AdapterRequestError) {
    logger.error('[images] adapter request failed', error);
    return res.status(502).json({ message: error.message });
  }
  logger.error('[images] unexpected error', error);
  return res.status(500).json({ message: 'Image generation failed.' });
}

const clampImages = (n) => Math.min(Math.max(parseInt(n, 10) || 1, 1), 4);

async function generate(req, res) {
  try {
    const service = buildService(req);
    const { useCase, prompt, referenceFileIds = [], numImages, aspectRatio, resolution, modelOverride, conversationId } =
      req.body;
    const record = await service.generate({
      userId: req.user.id,
      useCase,
      prompt,
      references: referenceFileIds.map((fileId) => ({ fileId })),
      numImages: clampImages(numImages),
      aspectRatio,
      resolution,
      modelOverride,
      conversationId,
    });
    return res.status(201).json(record);
  } catch (error) {
    return handleError(res, error);
  }
}

async function edit(req, res) {
  try {
    const service = buildService(req);
    const { sourceFileId, prompt, numImages, aspectRatio, resolution, modelOverride, conversationId } =
      req.body;
    const record = await service.edit({
      userId: req.user.id,
      sourceFileId,
      prompt,
      numImages: clampImages(numImages),
      aspectRatio,
      resolution,
      modelOverride,
      conversationId,
    });
    return res.status(201).json(record);
  } catch (error) {
    return handleError(res, error);
  }
}

async function listGenerations(req, res) {
  try {
    const service = buildService(req);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const result = await service.listGenerations(req.user.id, limit, req.query.cursor);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function getGeneration(req, res) {
  try {
    const service = buildService(req);
    const record = await service.getGeneration(req.user.id, req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Generation not found.' });
    }
    return res.json(record);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = { generate, edit, listGenerations, getGeneration };

const Question = require('../models/Question');
const Category = require('../models/Category');
const env = require('../config/env');
const { evaluateDuplicate } = require('../services/questionIngest');
const ALLOWED_STATUSES = ['pending', 'pending_review', 'approved', 'rejected', 'draft', 'archived'];
const ALLOWED_SOURCES = ['manual', 'ai-gen', 'community', 'ai', 'AI'];
const ALLOWED_PROVIDERS = ['manual', 'ai-gen', 'community'];
const TRUTHY_QUERY_VALUES = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSY_QUERY_VALUES = new Set(['0', 'false', 'no', 'n', 'off']);

const ALLOW_REVIEW_MODE_ALL = env?.features?.allowReviewModeAll !== false;

function normalizeStatus(status, fallback = 'approved') {
  if (typeof status !== 'string') return fallback;
  const candidate = status.trim().toLowerCase().replace(/[-\s]+/g, '_');
  return ALLOWED_STATUSES.includes(candidate) ? candidate : fallback;
}

function deriveCategorySlug(category) {
  if (!category) return '';
  if (typeof category.slug === 'string' && category.slug.trim()) {
    return category.slug.trim();
  }

  const source = typeof category.displayName === 'string'
    ? category.displayName
    : typeof category.name === 'string'
      ? category.name
      : '';

  return String(source)
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAuthorName(value, fallback = 'IQuiz Team') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function normalizeSource(value, fallback = 'manual') {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  const candidate = raw.toLowerCase();
  if (candidate === 'ai') {
    return 'AI';
  }
  if (candidate === 'ai-gen' || candidate === 'aigen') {
    return 'ai-gen';
  }
  if (ALLOWED_SOURCES.includes(candidate)) {
    return candidate;
  }
  if (ALLOWED_SOURCES.includes(raw)) {
    return raw;
  }
  return fallback;
}

function normalizeProvider(value, fallback = '') {
  const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (candidate && ALLOWED_PROVIDERS.includes(candidate)) {
    return candidate;
  }

  const fallbackCandidate = typeof fallback === 'string' ? fallback.trim().toLowerCase() : '';
  if (fallbackCandidate && ALLOWED_PROVIDERS.includes(fallbackCandidate)) {
    return fallbackCandidate;
  }

  return '';
}

function parseBooleanQuery(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  if (TRUTHY_QUERY_VALUES.has(normalized)) return true;
  if (FALSY_QUERY_VALUES.has(normalized)) return false;
  return fallback;
}

function extractOptionList(doc) {
  if (!doc || typeof doc !== 'object') return [];
  if (Array.isArray(doc.options)) return doc.options;
  if (Array.isArray(doc.choices)) return doc.choices;
  return [];
}

function isValidQuestionStructure(doc) {
  const text = typeof doc?.text === 'string' ? doc.text.trim() : '';
  if (!text) return false;

  const optionSource = extractOptionList(doc);
  if (!Array.isArray(optionSource) || optionSource.length < 2) return false;

  const normalizedOptions = optionSource.map((choice) => {
    if (typeof choice === 'string') return choice.trim();
    if (choice == null) return '';
    return String(choice).trim();
  });

  if (normalizedOptions.filter((choice) => choice.length > 0).length < 2) {
    return false;
  }

  const idxCandidate = doc?.correctIdx ?? doc?.correctIndex;
  const idx = Number(idxCandidate);
  if (!Number.isInteger(idx) || idx < 0 || idx >= optionSource.length) {
    return false;
  }

  return true;
}

function attachModerationMeta(doc) {
  const status = typeof doc?.status === 'string' ? doc.status : null;
  let active = null;
  if (typeof doc?.active === 'boolean') {
    active = doc.active;
  } else if (doc?.active === 1 || doc?.active === 0) {
    active = Boolean(doc.active);
  }

  return {
    ...doc,
    moderation: {
      status,
      active
    }
  };
}

exports.create = async (req, res, next) => {
  try {
    const {
      text,
      options,
      correctIdx,
      difficulty,
      categoryId,
      active,
      lang,
      authorName,
      status,
      source,
      reviewNotes
    } = req.body;

    const trimmedText = typeof text === 'string' ? text.trim() : '';
    if (!trimmedText) {
      return res.status(400).json({ ok: false, message: 'Question text is required' });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ ok: false, message: 'options must be array of 4 strings' });
    }

    const normalizedOptions = options.map((choice) => String(choice ?? '').trim());
    if (normalizedOptions.some((choice) => choice.length === 0)) {
      return res.status(400).json({ ok: false, message: 'All options must be non-empty strings' });
    }

    const idx = Number(correctIdx);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
      return res.status(400).json({ ok: false, message: 'correctIdx must be between 0 and 3' });
    }

    if (!categoryId) {
      return res.status(400).json({ ok: false, message: 'categoryId is required' });
    }

    let category;
    try {
      category = await Category.findById(categoryId);
    } catch (error) {
      if (error?.name === 'CastError') {
        return res.status(400).json({ ok: false, message: 'Invalid categoryId' });
      }
      throw error;
    }
    if (!category) {
      return res.status(404).json({ ok: false, message: 'Category not found' });
    }

    const difficultyKey = typeof difficulty === 'string' ? difficulty.toLowerCase() : 'easy';
    const allowedDifficulties = ['easy', 'medium', 'hard'];
    const safeDifficulty = allowedDifficulties.includes(difficultyKey) ? difficultyKey : 'easy';
    const normalizedStatus = normalizeStatus(status, 'approved');
    const safeSource = normalizeSource(source, 'manual');
    const safeProvider = normalizeProvider(req.body.provider, safeSource);
    const detectedLang = typeof lang === 'string' && lang.trim() ? lang.trim() : 'fa';
    const resolvedAuthor = normalizeAuthorName(authorName, safeSource === 'community' ? 'کاربر آیکوئیز' : 'IQuiz Team');
    const now = new Date();

    const ingestResult = await evaluateDuplicate({ text: trimmedText }, { QuestionModel: Question });
    if (ingestResult.action === 'reject') {
      return res.status(ingestResult.statusCode).json({
        ok: false,
        code: ingestResult.code,
        message: ingestResult.message,
        duplicateId: ingestResult.duplicateId || null
      });
    }

    const fingerprints = ingestResult.fingerprints || {};

    let finalStatus = normalizedStatus;
    if (ingestResult.action === 'review') {
      finalStatus = 'pending_review';
    }

    let isActive = typeof active === 'boolean' ? active : true;
    if (finalStatus !== 'approved') {
      isActive = false;
    }

    const questionPayload = {
      text: trimmedText,
      options: normalizedOptions,
      choices: normalizedOptions,
      correctIdx: idx,
      correctIndex: idx,
      difficulty: safeDifficulty,
      category: category._id,
      categoryName: category.displayName || category.name,
      categorySlug: deriveCategorySlug(category),
      active: isActive,
      lang: detectedLang,
      source: safeSource,
      provider: safeProvider,
      status: finalStatus,
      authorName: resolvedAuthor,
      isApproved: finalStatus === 'approved',
      sha1Canonical: fingerprints.sha1,
      simhash64: fingerprints.simhash,
      lshBucket: fingerprints.bucket
    };

    if (req.user?._id) {
      questionPayload.submittedBy = String(req.user._id);
    }

    if (finalStatus === 'pending') {
      questionPayload.submittedAt = now;
      questionPayload.reviewedAt = undefined;
      questionPayload.reviewedBy = undefined;
    } else if (finalStatus === 'approved' || finalStatus === 'rejected') {
      questionPayload.reviewedAt = now;
      if (req.user?._id) questionPayload.reviewedBy = req.user._id;
      if (finalStatus === 'rejected') {
        questionPayload.active = false;
      }
    }

    if (typeof reviewNotes === 'string' && reviewNotes.trim()) {
      questionPayload.reviewNotes = reviewNotes.trim();
    }

    if (!questionPayload.meta || typeof questionPayload.meta !== 'object') {
      questionPayload.meta = {};
    }
    if (fingerprints.normalized) {
      questionPayload.meta.normalizedText = fingerprints.normalized;
    }
    if (ingestResult.duplicateId) {
      questionPayload.meta.dupHint = ingestResult.duplicateId;
    }

    const q = await Question.create(questionPayload);

    if (ingestResult.action === 'review') {
      return res.status(ingestResult.statusCode).json({
        ok: true,
        code: ingestResult.code,
        data: q,
        duplicateId: ingestResult.duplicateId || null
      });
    }

    return res.status(ingestResult.statusCode || 201).json({ ok: true, data: q });
  } catch (e) { next(e); }
};

exports.search = async (req, res, next) => exports.list(req, res, next);

exports.listDuplicateSuspects = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Question.find({ status: 'pending_review' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Question.countDocuments({ status: 'pending_review' })
    ]);

    res.json({
      ok: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

const REVIEW_ACTIONS = new Set(['approve', 'reject', 'disable', 'merge']);

exports.reviewDuplicateCandidate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actionRaw = typeof req.body.action === 'string' ? req.body.action.trim().toLowerCase() : '';
    const action = actionRaw.replace(/[-\s]+/g, '_');
    if (!REVIEW_ACTIONS.has(action)) {
      return res.status(400).json({ ok: false, message: 'Invalid action' });
    }

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ ok: false, message: 'Question not found' });
    }

    const now = new Date();
    let reviewNotes = '';
    if (typeof req.body.reviewNotes === 'string') {
      reviewNotes = req.body.reviewNotes.trim();
    }

    if (!question.meta || typeof question.meta !== 'object') {
      question.meta = {};
    }

    switch (action) {
      case 'approve':
        question.status = 'approved';
        question.isApproved = true;
        question.active = true;
        delete question.meta.dupHint;
        break;
      case 'reject':
        question.status = 'rejected';
        question.isApproved = false;
        question.active = false;
        delete question.meta.dupHint;
        break;
      case 'disable':
        question.status = 'archived';
        question.isApproved = false;
        question.active = false;
        question.meta.archivedAt = now;
        delete question.meta.dupHint;
        break;
      case 'merge': {
        const targetId = typeof req.body.targetId === 'string' ? req.body.targetId.trim() : '';
        if (!targetId) {
          return res.status(400).json({ ok: false, message: 'targetId is required for merge action' });
        }
        question.status = 'archived';
        question.isApproved = false;
        question.active = false;
        question.meta.mergedInto = targetId;
        question.meta.mergedAt = now;
        delete question.meta.dupHint;
        break;
      }
      default:
        break;
    }

    question.reviewedAt = now;
    if (req.user?._id) {
      question.reviewedBy = req.user._id;
    }
    if (reviewNotes) {
      question.reviewNotes = reviewNotes;
    }

    await question.save();

    res.json({ ok: true, data: question });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      q = '',
      category,
      difficulty,
      sort = 'newest',
      source,
      status,
      provider,
      type,
      includeUnapproved: includeUnapprovedRaw,
      duplicatesOnly: duplicatesOnlyRaw,
      reviewMode: reviewModeRaw
    } = req.query;

    const requestedReviewModeAll = typeof reviewModeRaw === 'string'
      && reviewModeRaw.trim().toLowerCase() === 'all';
    let useReviewModeAll = false;

    if (requestedReviewModeAll) {
      if (!ALLOW_REVIEW_MODE_ALL) {
        useReviewModeAll = false;
      } else if (req.user?.role !== 'admin') {
        return res.status(403).json({ ok: false, message: 'Forbidden' });
      } else {
        useReviewModeAll = true;
      }
    }

    const includeUnapproved = useReviewModeAll
      ? true
      : parseBooleanQuery(includeUnapprovedRaw, false);
    const duplicatesOnly = parseBooleanQuery(duplicatesOnlyRaw, false);
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 200);
    const skip = (safePage - 1) * safeLimit;

    const where = {};
    const providerCandidate = provider ? normalizeProvider(provider, '') : '';

    if (q) where.text = { $regex: q, $options: 'i' };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (source) {
      const normalizedSource = normalizeSource(source, '');
      if (normalizedSource) {
        where.source = normalizedSource;
      }
    }

    if (providerCandidate) {
      const aliases = [providerCandidate];
      const providerConditions = [];

      aliases.forEach((alias) => {
        const aliasRegex = new RegExp(`^${alias}$`, 'i');
        providerConditions.push({ provider: aliasRegex });
        providerConditions.push({ source: aliasRegex });
        providerConditions.push({ 'sourceRef.provider': aliasRegex });
      });

      if (aliases.includes('jservice')) {
        providerConditions.push({ 'meta.jservice.id': { $exists: true } });
        providerConditions.push({ 'sourceRef.jserviceId': { $exists: true, $ne: null, $ne: '' } });
      }

      if (!where.$and) where.$and = [];
      where.$and.push({ $or: providerConditions });
    }

    if (status) {
      const candidate = String(status).trim().toLowerCase();
      if (ALLOWED_STATUSES.includes(candidate)) {
        where.status = candidate;
      } else if (candidate === 'active') {
        where.active = true;
      } else if (candidate === 'inactive') {
        where.active = false;
      }
    }

    if (type) {
      const typeCandidate = String(type).trim().toLowerCase();
      if (typeCandidate) {
        where.type = typeCandidate;
      }
    }

    let duplicateFilterUids = [];
    if (duplicatesOnly) {
      const duplicateGroups = await Question.aggregate([
        { $match: { uid: { $ne: null, $ne: '' } } },
        { $group: { _id: '$uid', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]);

      duplicateFilterUids = duplicateGroups.map((group) => group._id).filter(Boolean);

      if (!duplicateFilterUids.length) {
        const pendingTotal = await Question.countDocuments({ status: 'pending' });
        return res.json({
          ok: true,
          data: [],
          meta: {
            total: 0,
            page: safePage,
            limit: safeLimit,
            pendingTotal,
            duplicatesOnly: true,
            duplicateCounts: {}
          }
        });
      }

      where.uid = { $in: duplicateFilterUids };
    }

    if (!includeUnapproved && !where.status && !useReviewModeAll) {
      where.isApproved = { $ne: false };
    }

    const normalizedSort = typeof sort === 'string' ? sort.toLowerCase() : 'newest';
    const sortOption = normalizedSort === 'oldest'
      ? { createdAt: 1 }
      : { createdAt: -1 };

    const [items, total, pendingTotal] = await Promise.all([
      Question.find(where)
        .populate('category', 'name')
        .sort(sortOption)
        .skip(skip)
        .limit(safeLimit)
        .lean({ virtuals: true }),
      Question.countDocuments(where),
      Question.countDocuments({ status: 'pending' })
    ]);

    const sanitizedItems = items
      .filter((item) => isValidQuestionStructure(item))
      .map((item) => attachModerationMeta(item));

    const itemUids = sanitizedItems
      .map((item) => (item && typeof item.uid === 'string' ? item.uid : ''))
      .filter(Boolean);

    let duplicateCounts = {};
    if (itemUids.length) {
      const stats = await Question.aggregate([
        { $match: { uid: { $in: itemUids } } },
        { $group: { _id: '$uid', count: { $sum: 1 } } }
      ]);

      duplicateCounts = stats.reduce((acc, entry) => {
        if (entry && entry._id) {
          acc[entry._id] = entry.count;
        }
        return acc;
      }, {});
    }

    const dataWithDuplicates = sanitizedItems.map((item) => ({
      ...item,
      duplicateCount: item && item.uid ? (duplicateCounts[item.uid] || 0) : 0
    }));

    res.json({
      ok: true,
      data: dataWithDuplicates,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        pendingTotal,
        duplicatesOnly,
        duplicateCounts
      }
    });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { text, options, correctIdx, difficulty, active } = req.body;
    const updates = {};

    if (typeof text === 'string' && text.trim()) {
      updates.text = text.trim();
    }

    if (Array.isArray(options)) {
      if (options.length !== 4) {
        return res.status(400).json({ ok: false, message: 'options must be array of 4 strings' });
      }
      const normalizedOptions = options.map((choice) => String(choice ?? '').trim());
      if (normalizedOptions.some((choice) => choice.length === 0)) {
        return res.status(400).json({ ok: false, message: 'All options must be non-empty strings' });
      }
      updates.options = normalizedOptions;
      updates.choices = normalizedOptions;
    }

    if (correctIdx !== undefined) {
      const idx = Number(correctIdx);
      if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
        return res.status(400).json({ ok: false, message: 'correctIdx must be between 0 and 3' });
      }
      updates.correctIdx = idx;
      updates.correctIndex = idx;
    }

    if (typeof difficulty === 'string') {
      const difficultyKey = difficulty.toLowerCase();
      const allowedDifficulties = ['easy', 'medium', 'hard'];
      if (!allowedDifficulties.includes(difficultyKey)) {
        return res.status(400).json({ ok: false, message: 'Invalid difficulty' });
      }
      updates.difficulty = difficultyKey;
    }

    if (typeof active === 'boolean') {
      updates.active = active;
    }

    let categoryCandidate = req.body.categoryId;
    if (!categoryCandidate && typeof req.body.category === 'string') {
      categoryCandidate = req.body.category;
    }
    if (!categoryCandidate && req.body.category && typeof req.body.category._id === 'string') {
      categoryCandidate = req.body.category._id;
    }

    if (categoryCandidate) {
      let category;
      try {
        category = await Category.findById(categoryCandidate);
      } catch (error) {
        if (error?.name === 'CastError') {
          return res.status(400).json({ ok: false, message: 'Invalid categoryId' });
        }
        throw error;
      }
      if (!category) {
        return res.status(404).json({ ok: false, message: 'Category not found' });
      }
      updates.category = category._id;
      updates.categoryName = category.name;
      updates.categorySlug = deriveCategorySlug(category);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'authorName')) {
      const authorRaw = typeof req.body.authorName === 'string' ? req.body.authorName.trim() : '';
      if (authorRaw) updates.authorName = authorRaw;
      else updates.authorName = 'کاربر ناشناس';
    }

    if (typeof req.body.status === 'string') {
      const nextStatus = normalizeStatus(req.body.status, null);
      if (nextStatus) {
        updates.status = nextStatus;
        updates.isApproved = nextStatus === 'approved';
        if (nextStatus === 'pending') {
          updates.submittedAt = new Date();
          updates.reviewedAt = null;
          updates.reviewedBy = null;
          updates.active = false;
        } else {
          updates.reviewedAt = new Date();
          if (req.user?._id) updates.reviewedBy = req.user._id;
          if (nextStatus === 'approved') {
            if (!Object.prototype.hasOwnProperty.call(req.body, 'active')) {
              updates.active = true;
            }
          }
          if (nextStatus === 'rejected') {
            updates.active = false;
          }
        }
      }
    }

    if (typeof req.body.reviewNotes === 'string') {
      updates.reviewNotes = req.body.reviewNotes.trim();
    }

    const updated = await Question.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'Question not found' });
    }
    res.json({ ok: true, data: updated });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ ok:true });
  } catch (e) { next(e); }
};

exports.bulkDelete = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const normalizedIds = ids
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter(Boolean);

    if (!normalizedIds.length) {
      return res.status(400).json({ ok: false, message: 'ids array is required' });
    }

    let result;
    try {
      result = await Question.deleteMany({ _id: { $in: normalizedIds } });
    } catch (error) {
      if (error?.name === 'CastError') {
        return res.status(400).json({ ok: false, message: 'One or more ids are invalid' });
      }
      throw error;
    }

    res.json({ ok: true, deleted: result?.deletedCount || 0 });
  } catch (e) {
    next(e);
  }
};

exports.listDuplicates = async (req, res, next) => {
  try {
    const limitRaw = Number.parseInt(req.query?.limit, 10);
    const safeLimit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 500);

    const groups = await Question.aggregate([
      {
        $addFields: {
          dupKey: {
            $let: {
              vars: {
                uidCandidate: {
                  $cond: [
                    { $gt: [{ $strLenCP: { $ifNull: ['$uid', ''] } }, 0] },
                    '$uid',
                    null
                  ]
                },
                shaCandidate: {
                  $cond: [
                    { $gt: [{ $strLenCP: { $ifNull: ['$sha1Canonical', ''] } }, 0] },
                    '$sha1Canonical',
                    null
                  ]
                },
                checksumCandidate: {
                  $cond: [
                    { $gt: [{ $strLenCP: { $ifNull: ['$checksum', ''] } }, 0] },
                    '$checksum',
                    null
                  ]
                }
              },
              in: {
                $ifNull: ['$$uidCandidate', { $ifNull: ['$$shaCandidate', '$$checksumCandidate'] }]
              }
            }
          }
        }
      },
      { $match: { dupKey: { $ne: null, $ne: '' } } },
      { $sort: { dupKey: 1, createdAt: -1 } },
      {
        $group: {
          _id: '$dupKey',
          count: { $sum: 1 },
          items: {
            $push: {
              _id: '$_id',
              text: '$text',
              createdAt: '$createdAt',
              difficulty: '$difficulty',
              categoryName: '$categoryName',
              categorySlug: '$categorySlug',
              categoryId: '$category',
              source: '$source',
              provider: '$provider',
              lang: '$lang',
              options: '$choices',
              answerIndex: '$correctIndex',
              active: '$active',
              status: '$status',
              isApproved: '$isApproved',
              authorName: '$authorName',
              publicId: '$publicId',
              uid: '$uid',
              checksum: '$checksum',
              sha1Canonical: '$sha1Canonical'
            }
          }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: safeLimit }
    ]);

    const data = groups.map((group) => {
      const questions = Array.isArray(group.items) ? group.items.map((item) => {
        const options = Array.isArray(item.options) ? item.options : [];
        const safeAnswerIndex = Number.isInteger(item.answerIndex)
          ? item.answerIndex
          : Number.parseInt(item.answerIndex, 10);
        const normalizedAnswerIndex = Number.isInteger(safeAnswerIndex) && safeAnswerIndex >= 0 && safeAnswerIndex < options.length
          ? safeAnswerIndex
          : 0;
        const categoryId = item.categoryId ? String(item.categoryId) : '';
        const uid = item.uid ? String(item.uid) : '';
        return {
          _id: item._id,
          text: item.text,
          question: item.text,
          options,
          choices: options,
          answerIndex: normalizedAnswerIndex,
          correctIndex: normalizedAnswerIndex,
          correctIdx: normalizedAnswerIndex,
          difficulty: item.difficulty,
          category: item.categoryName,
          categoryName: item.categoryName,
          categorySlug: item.categorySlug,
          categoryId,
          source: item.source,
          provider: item.provider,
          lang: item.lang,
          createdAt: item.createdAt,
          active: item.active,
          status: item.status,
          isApproved: item.isApproved,
          authorName: item.authorName,
          publicId: item.publicId,
          uid,
          checksum: item.checksum,
          sha1Canonical: item.sha1Canonical
        };
      }) : [];

      return {
        uid: group._id,
        count: group.count,
        questions
      };
    });

    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
};

exports.submitPublic = async (req, res, next) => {
  try {
    const body = req.body || {};
    const questionTextRaw = typeof body.text === 'string' ? body.text : body.question;
    const trimmedText = typeof questionTextRaw === 'string' ? questionTextRaw.trim() : '';
    if (!trimmedText) {
      return res.status(400).json({ ok: false, message: 'متن سوال الزامی است.' });
    }

    const optionsRaw = Array.isArray(body.options)
      ? body.options
      : Array.isArray(body.choices)
        ? body.choices
        : [];
    if (!Array.isArray(optionsRaw) || optionsRaw.length !== 4) {
      return res.status(400).json({ ok: false, message: 'چهار گزینه معتبر وارد کنید.' });
    }

    const normalizedOptions = optionsRaw.map((choice) => String(choice ?? '').trim());
    if (normalizedOptions.some((choice) => choice.length === 0)) {
      return res.status(400).json({ ok: false, message: 'تمام گزینه‌ها باید تکمیل شوند.' });
    }

    let idxCandidate = body.correctIdx;
    if (idxCandidate == null) idxCandidate = body.correctIndex;
    if (idxCandidate == null) idxCandidate = body.correctOption;
    const idx = Number(idxCandidate);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
      return res.status(400).json({ ok: false, message: 'گزینه صحیح را مشخص کنید.' });
    }

    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
    if (!categoryId) {
      return res.status(400).json({ ok: false, message: 'انتخاب دسته‌بندی اجباری است.' });
    }

    let category;
    try {
      category = await Category.findById(categoryId);
    } catch (error) {
      if (error?.name === 'CastError') {
        return res.status(400).json({ ok: false, message: 'شناسه دسته‌بندی نامعتبر است.' });
      }
      throw error;
    }
    if (!category) {
      return res.status(404).json({ ok: false, message: 'دسته‌بندی پیدا نشد.' });
    }

    const difficultyKey = typeof body.difficulty === 'string' ? body.difficulty.toLowerCase() : 'medium';
    const allowedDifficulties = ['easy', 'medium', 'hard'];
    const safeDifficulty = allowedDifficulties.includes(difficultyKey) ? difficultyKey : 'medium';
    const resolvedAuthor = normalizeAuthorName(body.authorName, 'کاربر آیکوئیز');
    const now = new Date();

    await Question.create({
      text: trimmedText,
      options: normalizedOptions,
      choices: normalizedOptions,
      correctIdx: idx,
      correctIndex: idx,
      difficulty: safeDifficulty,
      category: category._id,
      categoryName: category.name,
      categorySlug: deriveCategorySlug(category),
      active: false,
      lang: 'fa',
      source: 'community',
      status: 'pending',
      isApproved: false,
      authorName: resolvedAuthor,
      submittedBy: typeof body.submittedBy === 'string' ? body.submittedBy.trim() : undefined,
      submittedAt: now
    });

    return res.status(201).json({
      ok: true,
      message: 'سوال شما با موفقیت ثبت شد و پس از تایید در مسابقات نمایش داده می‌شود.'
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: 'این سوال قبلاً ارسال شده است.' });
    }
    next(error);
  }
};

exports.statsSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const [total, today, yesterday] = await Promise.all([
      Question.countDocuments(),
      Question.countDocuments({ createdAt: { $gte: startOfToday, $lt: startOfTomorrow } }),
      Question.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfToday } })
    ]);

    res.json({ ok: true, data: { total, today, yesterday } });
  } catch (e) {
    next(e);
  }
};

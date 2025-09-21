const Question = require('../models/Question');
const Category = require('../models/Category');
const { normalizeProviderId } = require('../services/triviaProviders');

const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'draft', 'archived'];
const ALLOWED_SOURCES = ['manual', 'opentdb', 'the-trivia-api', 'cluebase', 'jservice', 'community'];
const ALLOWED_PROVIDERS = ['manual', 'opentdb', 'the-trivia-api', 'cluebase', 'jservice', 'community'];
const TRUTHY_QUERY_VALUES = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSY_QUERY_VALUES = new Set(['0', 'false', 'no', 'n', 'off']);

function normalizeStatus(status, fallback = 'approved') {
  if (typeof status !== 'string') return fallback;
  const candidate = status.trim().toLowerCase();
  return ALLOWED_STATUSES.includes(candidate) ? candidate : fallback;
}

function normalizeAuthorName(value, fallback = 'IQuiz Team') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function normalizeSource(value, fallback = 'manual') {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim().toLowerCase();
  return ALLOWED_SOURCES.includes(candidate) ? candidate : fallback;
}

function normalizeProvider(value, fallback = '') {
  if (typeof value === 'string') {
    const candidate = normalizeProviderId(value);
    if (candidate && ALLOWED_PROVIDERS.includes(candidate)) {
      return candidate;
    }
  }

  if (typeof fallback === 'string') {
    const fallbackCandidate = normalizeProviderId(fallback);
    if (fallbackCandidate && ALLOWED_PROVIDERS.includes(fallbackCandidate)) {
      return fallbackCandidate;
    }
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
    let isActive = typeof active === 'boolean' ? active : true;
    if (normalizedStatus !== 'approved') {
      isActive = false;
    }
    const detectedLang = typeof lang === 'string' && lang.trim() ? lang.trim() : 'fa';
    const resolvedAuthor = normalizeAuthorName(authorName, safeSource === 'community' ? 'کاربر آیکوئیز' : 'IQuiz Team');
    const now = new Date();

    const questionPayload = {
      text: trimmedText,
      options: normalizedOptions,
      choices: normalizedOptions,
      correctIdx: idx,
      correctIndex: idx,
      difficulty: safeDifficulty,
      category: category._id,
      categoryName: category.name,
      active: isActive,
      lang: detectedLang,
      source: safeSource,
      provider: safeProvider,
      status: normalizedStatus,
      authorName: resolvedAuthor,
      isApproved: normalizedStatus === 'approved'
    };

    if (req.user?._id) {
      questionPayload.submittedBy = String(req.user._id);
    }

    if (normalizedStatus === 'pending') {
      questionPayload.submittedAt = now;
      questionPayload.reviewedAt = undefined;
      questionPayload.reviewedBy = undefined;
    } else if (normalizedStatus === 'approved' || normalizedStatus === 'rejected') {
      questionPayload.reviewedAt = now;
      if (req.user?._id) questionPayload.reviewedBy = req.user._id;
      if (normalizedStatus === 'rejected') {
        questionPayload.active = false;
      }
    }

    if (typeof reviewNotes === 'string' && reviewNotes.trim()) {
      questionPayload.reviewNotes = reviewNotes.trim();
    }

    const q = await Question.create(questionPayload);
    res.status(201).json({ ok: true, data: q });
  } catch (e) { next(e); }
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
      includeUnapproved: includeUnapprovedRaw
    } = req.query;
    const where = {};
    const includeUnapproved = parseBooleanQuery(includeUnapprovedRaw, false);
    const providerCandidate = provider ? normalizeProvider(provider, '') : '';
    if (q) where.text = { $regex: q, $options: 'i' };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (source) {
      const sourceCandidate = String(source).trim().toLowerCase();
      if (ALLOWED_SOURCES.includes(sourceCandidate)) where.source = sourceCandidate;
    }
    if (providerCandidate) {
      const aliases = [providerCandidate];
      if (providerCandidate === 'cluebase') {
        aliases.push('jservice');
      }

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
    if (providerCandidate === 'cluebase' && !includeUnapproved && !where.status) {
      where.status = 'approved';
    }
    if (type) {
      const typeCandidate = String(type).trim().toLowerCase();
      if (typeCandidate) {
        where.type = typeCandidate;
      }
    }

    const normalizedSort = typeof sort === 'string' ? sort.toLowerCase() : 'newest';
    const sortOption = normalizedSort === 'oldest'
      ? { createdAt: 1 }
      : { createdAt: -1 };

    const [items, total, pendingTotal] = await Promise.all([
      Question.find(where)
        .populate('category','name')
        .sort(sortOption)
        .skip((page-1)*limit)
        .limit(Number(limit)),
      Question.countDocuments(where),
      Question.countDocuments({ status: 'pending' })
    ]);
    res.json({ ok:true, data:items, meta:{ total, page:Number(page), limit:Number(limit), pendingTotal } });
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

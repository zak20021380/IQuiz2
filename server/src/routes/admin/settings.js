const router = require('express').Router();
const { requireAdmin } = require('../../middleware/adminAuth');
const {
  getAdminSettingsSnapshot,
  saveAdminSettings,
  AdminSettingsValidationError,
} = require('../../config/adminSettings');

router.use(requireAdmin);

router.get('/', (req, res, next) => {
  try {
    const data = getAdminSettingsSnapshot();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
    const baseData = rawBody.data && typeof rawBody.data === 'object'
      ? { ...rawBody.data }
      : { ...rawBody };

    delete baseData.data;
    delete baseData.updatedAt;
    delete baseData.updatedBy;

    if (baseData.shop && typeof baseData.shop === 'object') {
      baseData.shop = { ...baseData.shop };
      delete baseData.shop.updatedAt;
      delete baseData.shop.updatedBy;
    }

    const saved = await saveAdminSettings(baseData, {
      actorId: req.user?.id || req.user?._id || null,
    });

    res.json({ ok: true, data: saved });
  } catch (error) {
    if (error instanceof AdminSettingsValidationError) {
      return res.status(400).json({ ok: false, message: error.message, details: error.details });
    }
    next(error);
  }
});

module.exports = router;

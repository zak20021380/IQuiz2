const router = require('express').Router();
const { protect, adminOnly } = require('../../middleware/auth');
const {
  getAdminSettingsSnapshot,
  saveAdminSettings,
  AdminSettingsValidationError,
} = require('../../config/adminSettings');

router.use(protect, adminOnly);

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
    const payload = req.body && typeof req.body === 'object' ? { ...req.body } : {};
    delete payload.updatedAt;
    delete payload.updatedBy;
    if (payload.shop && typeof payload.shop === 'object') {
      payload.shop = { ...payload.shop };
      delete payload.shop.updatedAt;
      delete payload.shop.updatedBy;
    }
    const saved = await saveAdminSettings(payload, { actorId: req.user?.id || req.user?._id || null });
    res.json({ ok: true, data: saved });
  } catch (error) {
    if (error instanceof AdminSettingsValidationError) {
      return res.status(400).json({ ok: false, message: error.message, details: error.details });
    }
    next(error);
  }
});

module.exports = router;

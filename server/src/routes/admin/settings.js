const router = require('express').Router();
const { protect, adminOnly } = require('../../middleware/auth');
const { getAdminSettingsSnapshot, saveAdminSettings } = require('../../config/adminSettings');

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
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const saved = await saveAdminSettings(payload);
    res.json({ ok: true, data: saved });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

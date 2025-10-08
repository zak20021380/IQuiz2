module.exports = {
  getFallbackCategories: () => ([
    { id: 'general', name: 'عمومی' },
    { id: 'science', name: 'علمی' },
    { id: 'sports', name: 'ورزشی' }
  ]),
  getFallbackProvinces: () => ([
    { id: 1, name: 'تهران' },
    { id: 2, name: 'اصفهان' },
    { id: 3, name: 'فارس' }
  ]),
  getFallbackConfig: () => ({ ok: true })
};

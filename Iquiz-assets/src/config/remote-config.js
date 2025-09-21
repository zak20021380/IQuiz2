// Remote configuration settings and helpers for IQuiz assets.

export const RemoteConfig = {
  ab: (Math.random() < 0.5) ? 'A' : 'B',

  provinceTargeting: { enabled: true, allow: ['تهران','کردستان','آذربایجان غربی','اصفهان'] },

  ads: {
    enabled: true,
    placements: { banner:true, native:true, interstitial:true, rewarded:true },
    freqCaps: { interstitialPerSession: 2, rewardedPerSession: 3 },
    interstitialCooldownMs: 60_000,
    rewardedMinWatchMs: 7_000,
    session: { interstitialShown: 0, rewardedShown: 0, lastInterstitialAt: 0 }
  },

  pricing: {
    usdToToman: 70_000,

    coins: [
      { id:'c100',  amount:100,  bonus:0,  priceToman: 59_000,   priceCents:199  },
      { id:'c500',  amount:500,  bonus:5,  priceToman: 239_000,  priceCents:799  },
      { id:'c1200', amount:1200, bonus:12, priceToman: 459_000,  priceCents:1499 },
      { id:'c3000', amount:3000, bonus:25, priceToman: 899_000,  priceCents:2999 }
    ],

    vip: {
      lite: { id:'vip_lite', priceCents:299 },
      pro:  { id:'vip_pro',  priceCents:599 }
    },

    keys: [
      { id:'k1',  amount:1,  priceGame:30  },
      { id:'k3',  amount:3,  priceGame:80  },
      { id:'k10', amount:10, priceGame:250 }
    ]
  },

  abOverrides: {
    A: { ads:{ freqCaps:{ interstitialPerSession:2 } } },
    B: { ads:{ freqCaps:{ interstitialPerSession:1 } } }
  },

  gameLimits: {
    matches: { daily: 5, vipMultiplier: 2, recoveryTime: 2 * 60 * 60 * 1000 },
    duels:   { daily: 3, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },
    lives:   { daily: 3, vipMultiplier: 2, recoveryTime: 30 * 60 * 1000 },
    groupBattles: { daily: 2, vipMultiplier: 2, recoveryTime: 60 * 60 * 1000 },
    energy:  { daily: 10, vipMultiplier: 2, recoveryTime: 15 * 60 * 1000 }
  }
};

export function patchPricingKeys(config = RemoteConfig){
  const defaults = [
    { id:'k1',  amount:1,  priceGame:30,  label:'بسته کوچک'     },
    { id:'k3',  amount:3,  priceGame:80,  label:'بسته اقتصادی'   },
    { id:'k10', amount:10, priceGame:250, label:'بسته بزرگ'      }
  ];

  if (!config.pricing) config.pricing = {};

  const packs = config.pricing.keys;
  const bad = (p)=> typeof p?.amount!=='number' || typeof p?.priceGame!=='number' || p.amount<=0 || p.priceGame<=0;

  if (!Array.isArray(packs) || packs.length===0 || packs.some(bad)){
    config.pricing.keys = defaults;
  } else {
    config.pricing.keys = packs
      .map(p => ({
        id: String(p.id || ('k' + p.amount)),
        amount: +p.amount,
        priceGame: +p.priceGame,
        label: p.label || (p.amount<=1 ? 'بسته کوچک' : p.amount<=3 ? 'بسته اقتصادی' : 'بسته بزرگ')
      }))
      .filter(p => p.amount>0 && p.priceGame>0)
      .sort((a,b)=> a.amount - b.amount);
  }

  return config.pricing.keys;
}

export function applyAB(config = RemoteConfig){
  const overrides = config?.abOverrides?.[config?.ab];
  if(!overrides) return config;

  const deepMerge = (target, source) => {
    for (const key in source){
      const value = source[key];
      if (typeof value === 'object' && value){
        target[key] = target[key] || {};
        deepMerge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  };

  deepMerge(config, overrides);
  return config;
}

patchPricingKeys(RemoteConfig);
applyAB(RemoteConfig);

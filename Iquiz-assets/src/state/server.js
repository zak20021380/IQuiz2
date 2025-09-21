const Server = {
  wallet: { coins: null, lastTxnId: null },
  subscription: { active:false, status:'unknown', expiry:null, autoRenew:false, plan:null, tier:null },
  user: { province:'تهران' },
  limits: {
    matches: { used: 0, lastReset: 0, lastRecovery: 0 },
    duels: { used: 0, lastReset: 0, lastRecovery: 0 },
    lives: { used: 0, lastReset: 0, lastRecovery: 0 },
    groupBattles: { used: 0, lastReset: 0, lastRecovery: 0 },
    energy: { used: 0, lastReset: 0, lastRecovery: 0 }
  },
  pass: {
    freeXp: 0,
    premiumXp: 0,
    season: 1,
    week: 1,
    missions: {
      daily: [],
      weekly: []
    }
  }
};

export { Server };

// v6 (no CSV) with News Preview + Chat
window.APP_CONFIG = {
  proxies: {
    reddit: "https://spring-bonus-310e.shyamvishnu19.workers.dev/reddit/search",
    twitter: "https://spring-bonus-310e.shyamvishnu19.workers.dev/twitter/search",
    threads: "https://spring-bonus-310e.shyamvishnu19.workers.dev/threads/search",
    chat: "https://spring-bonus-310e.shyamvishnu19.workers.dev/chat",
    news: "https://spring-bonus-310e.shyamvishnu19.workers.dev/news/fetch"
  },
  games: {
    CODM: {
      name: "Call of Duty: Mobile",
      newsPage: "https://www.callofduty.com/blog/mobile",
      // Optional: hardcode your subreddits/handles if your worker expects them:
      subreddits: ["CallOfDutyMobile","CODMobile"],
      twitter: { handles: ["PlayCODMobile","codmINTEL"], hashtags: ["CODMobile","CODM"] },
      threads: { handles: [] }
    },
    PUBG: {
      name: "PUBG Mobile",
      newsPage: "https://www.pubgmobile.com/en-US/news.shtml",
      subreddits: ["PUBGMobile"],
      twitter: { handles: ["PUBGMobile"], hashtags: ["PUBGMobile"] },
      threads: { handles: [] }
    },
    FREEFIRE: {
      name: "Free Fire",
      newsPage: "https://ff.garena.com/news/en/",
      subreddits: ["freefire"],
      twitter: { handles: ["FreeFire"], hashtags: ["FreeFire"] },
      threads: { handles: [] }
    },
    DELTA: {
      name: "Delta Force",
      newsPage: "https://www.deltaforcegame.com/news",
      subreddits: [],
      twitter: { handles: [], hashtags: [] },
      threads: { handles: [] }
    }
  }
};

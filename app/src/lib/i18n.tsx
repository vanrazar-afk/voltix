import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { legacyStorage } from './store';
import type { Factor, PillarResult, SentimentResult } from './types';

export type Lang = 'he' | 'en';

// Hebrew-first product: always start in Hebrew; users switch with the עב/EN toggle.
const deviceLang: Lang = 'he';

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist((set) => ({ lang: deviceLang, setLang: (lang) => set({ lang }) }), {
    name: 'voltix-lang',
    storage: createJSONStorage(() => legacyStorage('stoxx-lang')),
  }),
);

const D = {
  // tabs
  tab_rank: ['ראשי', 'Home'],
  tab_portfolio: ['התיק שלי', 'Portfolio'],
  tab_watch: ['מעקב', 'Watchlist'],
  tab_learn: ['מדריך', 'Guide'],
  tab_chats: ['קבוצות', 'Groups'],
  tab_news: ['חדשות', 'News'],
  tab_league: ['ליגה', 'League'],
  menu_open: ['תפריט חשבון', 'Account menu'],
  menu_guest: ['אורח', 'Guest'],
  menu_guest_sub: ['ללא חשבון — הנתונים נשמרים במכשיר', 'No account — data stays on this device'],
  tab_settings: ['הגדרות', 'Settings'],
  // home
  daily_rank: ['הדירוג היומי', 'Daily ranking'],
  top50_title: ['50 המובילות לפי המודל', 'Top 50 by the model'],
  avg_score: ['ציון ממוצע', 'Avg. score'],
  scanned: ['מניות נסרקו', 'Stocks scanned'],
  newcomers: ['חדשות ברשימה', 'New today'],
  updated: ['עודכן', 'Updated'],
  search_ph: ['חיפוש סימול או חברה', 'Search ticker or company'],
  sort_score: ['ציון כולל', 'Total score'],
  sort_tech: ['טכני', 'Technical'],
  sort_fund: ['פונדמנטלי', 'Fundamental'],
  sort_sent: ['סנטימנט', 'Sentiment'],
  all_sectors: ['כל הענפים', 'All sectors'],
  no_results: ['לא נמצאו מניות', 'No stocks found'],
  target: ['יעד', 'Target'],
  stop: ['סטופ', 'Stop'],
  new_badge: ['חדש', 'NEW'],
  load_error: ['לא ניתן לטעון את הדירוג העדכני. מוצג המידע האחרון שנשמר.', 'Could not load the latest ranking. Showing the last saved data.'],
  demo_banner: ['מצב הדגמה: הנתונים המוצגים סינתטיים ואינם נתוני שוק אמיתיים.', 'Demo mode: the data shown is synthetic, not real market data.'],
  disclaimer: [
    'המידע מוצג לצרכי מידע ולימוד בלבד ואינו מהווה ייעוץ השקעות, שיווק השקעות או המלצה לפעולה בניירות ערך. הדירוג מופק אוטומטית ע"י מודל כמותי ואינו מותאם אישית. השקעה בשוק ההון כרוכה בסיכון.',
    'For information and education only. Not investment advice, marketing or a recommendation to buy or sell any security. Rankings are produced automatically by a quantitative model and are not personalised. Investing involves risk.',
  ],
  // stock
  rank_of: ['מקום {n} מתוך 50', 'Rank {n} of 50'],
  score_yesterday: ['ציון קודם {n}', 'Previous score {n}'],
  earnings_on: ['דוחות ב-{d}', 'Earnings {d}'],
  overbought: ['קניית יתר', 'Overbought'],
  low_news: ['סיקור חדשותי דל', 'Low news coverage'],
  p_tech: ['ניתוח טכני', 'Technical analysis'],
  p_fund: ['ניתוח פונדמנטלי', 'Fundamental analysis'],
  p_sent: ['סנטימנט שוק', 'Market sentiment'],
  levels_title: ['רמות טכניות: כניסה, יעד וסטופ', 'Technical levels: entry, target & stop'],
  last_price: ['מחיר אחרון', 'Last price'],
  exit_target: ['יעד יציאה', 'Exit target'],
  rr: ['סיכוי/סיכון', 'Risk/reward'],
  analyst_avg: ['יעד אנליסטים ממוצע', 'Avg. analyst target'],
  col_metric: ['מדד', 'Metric'],
  col_value: ['ערך', 'Value'],
  col_points: ['נקודות', 'Points'],
  positive: ['חיובי', 'Positive'],
  neutral: ['ניטרלי', 'Neutral'],
  negative: ['שלילי', 'Negative'],
  sources_n: ['{n} מקורות', '{n} sources'],
  no_articles: ['אין כתבות רלוונטיות בשבוע האחרון.', 'No relevant articles in the past week.'],
  add_to_portfolio: ['קניית המניה', 'Buy this stock'],
  not_in_top: ['המניה אינה ברשימת 50 המובילות של היום, ולכן אין לה כרגע ניתוח מפורט.', 'This stock is not in today’s top 50, so there is no detailed analysis right now.'],
  watch_add: ['הוספה לרשימת המעקב', 'Add to watchlist'],
  watch_remove: ['הסרה מרשימת המעקב', 'Remove from watchlist'],
  // portfolio
  pf_value: ['שווי התיק', 'Portfolio value'],
  pf_total: ['סה"כ', 'total'],
  pf_today: ['היום', 'today'],
  pf_empty_t: ['התיק שלך ריק', 'Your portfolio is empty'],
  pf_empty_b: ['קנו מניות בזמן המסחר בוול סטריט ועקבו אחרי התשואה של כל אחת, הפיזור הענפי וציון התיק.', 'Buy stocks while Wall Street is open and track each one’s return, your sector mix and portfolio score.'],
  pf_score: ['ציון תיק משוקלל', 'Weighted portfolio score'],
  pf_score_sub: ['לפי מניות שבדירוג היום', 'from stocks in today’s ranking'],
  pf_sectors: ['פיזור ענפי', 'Sector mix'],
  pf_holdings: ['אחזקות', 'Holdings'],
  pf_units: ["יח'", 'sh'],
  pf_avg_cost: ['עלות ממוצעת', 'avg. cost'],
  pf_no_quote: ['אין ציטוט עדכני למניה זו — מוצג לפי מחיר העלות.', 'No current quote for this stock — shown at cost.'],
  pf_day_change: ['שינוי יומי', 'Day change'],
  pf_add: ['קניית מניה', 'Buy a stock'],
  pf_local: ['כאורח התיק נשמר במכשיר הזה; עם חשבון Google הוא מסונכרן בין המכשירים שלך.', 'As a guest the portfolio stays on this device; with Google sign-in it syncs across your devices.'],
  pf_delete_t: ['מחיקת אחזקה', 'Delete holding'],
  pf_delete_b: ['למחוק את כל העסקאות של {s}?', 'Delete all trades of {s}?'],
  cancel: ['ביטול', 'Cancel'],
  delete: ['מחיקה', 'Delete'],
  // add holding
  ah_title: ['קניית מניה', 'Buy a stock'],
  ah_symbol: ['סימול מניה', 'Ticker'],
  ah_qty: ['כמות מניות', 'Shares'],
  ah_price: ['מחיר קנייה למניה ($)', 'Buy price per share ($)'],
  ah_date: ['תאריך', 'Date'],
  ah_save: ['שמירה', 'Save'],
  ah_last: ['מחיר אחרון', 'last price'],
  err_symbol: ['סימול לא תקין', 'Invalid ticker'],
  err_qty: ['כמות חייבת להיות גדולה מ-0', 'Shares must be greater than 0'],
  err_price: ['מחיר חייב להיות גדול מ-0', 'Price must be greater than 0'],
  err_date: ['תאריך בפורמט YYYY-MM-DD', 'Date must be YYYY-MM-DD'],
  // watchlist
  wl_title: ['רשימת מעקב', 'Watchlist'],
  wl_sub: ['מניות שסימנתם בכוכב. מניה שנכנסת ל-50 המובילות תוצג עם ניתוח מלא.', 'Stocks you starred. Any that enter the top 50 show a full analysis.'],
  wl_empty: ['עדיין לא הוספתם מניות. לחצו על ⭐ בדף מניה כדי לעקוב אחריה.', 'No stocks yet. Tap ⭐ on a stock page to follow it.'],
  wl_not_top: ['לא ב-50 המובילות היום', 'not in today’s top 50'],
  // settings
  st_title: ['הגדרות', 'Settings'],
  st_lang: ['שפה', 'Language'],
  st_privacy: ['מדיניות פרטיות', 'Privacy policy'],
  st_terms: ['תנאי שימוש', 'Terms of use'],
  st_contact: ['יצירת קשר ודיווח על תקלה', 'Contact & report a problem'],
  st_reset: ['מחיקת כל הנתונים שלי', 'Delete all my data'],
  st_reset_b: ['כל העסקאות, רשימת המעקב וההגדרות יימחקו מהמכשיר לצמיתות.', 'All trades, watchlist and settings will be permanently deleted from this device.'],
  st_about: ['על הנתונים', 'About the data'],
  st_demo: ['מצב הדגמה — נתונים סינתטיים.', 'Demo mode — synthetic data.'],
  st_last: ['עדכון אחרון: {d}.', 'Last update: {d}.'],
  st_source: ['מקור: {s}.', 'Source: {s}.'],
  st_method: ['גרסת מתודולוגיה {v}. נתוני מחירים ודוחות כספיים מסופקים ע"י ספקי מידע צד ג\' ועשויים להכיל עיכובים או טעויות.', 'Methodology v{v}. Prices and financials come from third-party providers and may contain delays or errors.'],
  st_version: ['גרסת אפליקציה {v}', 'App version {v}'],
  st_restart: ['השפה תתעדכן במלואה לאחר פתיחה מחדש של האפליקציה.', 'The layout direction updates fully after reopening the app.'],
  // onboarding
  ob_tagline: ['ניתוח מניות חכם — טכני, פונדמנטלי וסנטימנט, בציון אחד.', 'Smart stock analysis — technical, fundamental and sentiment in one score.'],
  ob_p1_t: ['דירוג חי של כל 500 המניות', 'A live ranking of all 500 stocks'],
  ob_p1_b: ['מודל כמותי מדרג את מניות S&P 500 לפי ציון 1–100, ומתעדכן כל 5 דקות בזמן המסחר.', 'A quantitative model scores every S&P 500 stock 1–100, refreshed every 5 minutes during trading.'],
  ob_p2_t: ['שלושה שלישים לציון', 'Three equal thirds'],
  ob_p2_b: ['ניתוח טכני, ניתוח פונדמנטלי מול הענף, וסנטימנט מאתרי החדשות הפיננסיים הגדולים.', 'Technical analysis, fundamentals vs. the sector, and sentiment from major financial news outlets.'],
  ob_p3_t: ['התיק שלך', 'Your portfolio'],
  ob_p3_b: ['עקבו אחרי העסקאות שלכם — הנתונים נשמרים במכשיר בלבד.', 'Track your trades — data stays on your device.'],
  ob_important: ['חשוב לדעת', 'Important'],
  ob_legal: [
    'VOLTIX היא אפליקציית מידע ולימוד. הדירוגים, היעדים ורמות הסטופ מופקים אוטומטית ע"י מודל כמותי, אינם מותאמים לצרכים, למצב הכלכלי או להעדפות הסיכון שלך, ואינם מהווים ייעוץ השקעות, שיווק השקעות או המלצה לקנות או למכור נייר ערך. ייתכנו טעויות ועיכובים בנתונים. ביצועי עבר אינם מבטיחים תוצאות עתידיות, והשקעה בשוק ההון עלולה לגרום להפסד כספי. לפני קבלת החלטת השקעה מומלץ להתייעץ עם בעל רישיון.',
    'VOLTIX is an information and education app. Scores, targets and stop levels are generated automatically by a quantitative model, are not tailored to your needs, financial situation or risk preferences, and are not investment advice, investment marketing or a recommendation to buy or sell any security. Data may contain errors or delays. Past performance does not guarantee future results and investing may lead to losses. Consider consulting a licensed adviser before investing.',
  ],
  ob_check: ['קראתי והבנתי שהמידע באפליקציה אינו ייעוץ השקעות, ואני בן/בת 18 ומעלה.', 'I understand this app is not investment advice and I am 18 or older.'],
  ob_start: ['בואו נתחיל', 'Get started'],
  // price chart & full S&P list
  price_history: ['מחיר לאורך זמן', 'Price history'],
  chart_unavailable: ['אין נתוני גרף זמינים כרגע', 'Chart data not available yet'],
  no_score: ['ללא ציון', 'No score'],
  unscored_title: ['שאר מניות S&P 500', 'Rest of the S&P 500'],
  unscored_sub: ['מניות שלא נכנסו ל-50 המובילות — ללא ציון', 'Not in today’s top 50 — no score'],
  ch_title: ['קבוצות דיון', 'Discussion groups'],
  ch_sub: ['צ\'אט קבוצתי עם חברים על מניה, על השוק או על התיק — בהזמנה בלבד.', 'Group chats with friends about a stock, the market or your portfolio — invite only.'],
  ch_new: ['קבוצה חדשה', 'New group'],
  ch_need_google: ['כדי לפתוח קבוצות ולהצטרף אליהן צריך להתחבר — עם Google או עם מייל — כך החברים יודעים מי כותב.', 'Groups need a sign-in — Google or email — so friends know who is writing.'],
  ch_unavailable: ['קבוצות הדיון יופעלו בקרוב.', 'Discussion groups are coming soon.'],
  ch_empty: ['אין עדיין קבוצות. פתחו קבוצה חדשה ושלחו קישור הזמנה לחברים.', 'No groups yet. Create one and send friends an invite link.'],
  ch_members: ['{n} חברים', '{n} members'],
  ch_rules: ['כללי הקהילה: מדברים בכבוד, בלי הטרדות, ספאם או "טיפים" בתשלום. הדיונים הם בין משתמשים — זה לא ייעוץ השקעות. אפשר לדווח על הודעה בלחיצה ארוכה עליה.', 'Community rules: be respectful — no harassment, spam or paid "tips". Discussions are between users and are not investment advice. Long-press a message to report it.'],
  ch_name: ['שם הקבוצה', 'Group name'],
  ch_name_ph: ['למשל: החבר\'ה של NVDA', 'e.g. NVDA crew'],
  ch_topic: ['נושא', 'Topic'],
  ch_ticker: ['סימול המניה', 'Stock ticker'],
  ch_ticker_bad: ['הסימול לא נמצא ב-S&P 500', 'Ticker not found in the S&P 500'],
  ch_create: ['יצירת הקבוצה', 'Create group'],
  ch_invite: ['הזמנת חברים', 'Invite friends'],
  ch_invite_title: ['הזמנה לקבוצה', 'Group invite'],
  ch_invite_copied: ['הקישור הועתק — שלחו אותו לחברים (בתוקף 7 ימים).', 'Link copied — send it to friends (valid 7 days).'],
  ch_invite_msg: ['הצטרפו לקבוצה "{n}" ב-VOLTIX:', 'Join my group "{n}" on VOLTIX:'],
  ch_join: ['הצטרפות לקבוצה', 'Join group'],
  ch_join_bad: ['ההזמנה לא תקינה או שפג תוקפה. בקשו מחבר קישור חדש.', 'This invite is invalid or expired. Ask a friend for a new link.'],
  ch_open: ['מעבר לקבוצה', 'Open group'],
  ch_msg_ph: ['כתבו הודעה… ($AAPL יוצר קישור למניה)', 'Write a message… ($AAPL links the stock)'],
  ch_send: ['שליחה', 'Send'],
  ch_leave: ['יציאה מהקבוצה', 'Leave group'],
  ch_delete: ['מחיקת הקבוצה', 'Delete group'],
  ch_report: ['דיווח על ההודעה', 'Report message'],
  ch_reported: ['תודה, הדיווח נשלח לבדיקה.', 'Thanks — the report was sent for review.'],
  ch_block: ['הסתרת ההודעות של {n}', 'Hide messages from {n}'],
  ch_unblock: ['ביטול ההסתרה של {n}', 'Unhide {n}'],
  ch_hidden: ['הודעה מוסתרת', 'Hidden message'],
  ch_del_msg: ['מחיקת ההודעה', 'Delete message'],
  ch_first: ['זו תחילת השיחה. הזמינו חברים והתחילו לדבר!', 'This is the start of the chat. Invite friends and start talking!'],
  ch_gone: ['הקבוצה לא קיימת או שאינך חבר בה.', 'This group does not exist or you are not a member.'],
  topic_stock: ['מניה', 'A stock'],
  topic_market: ['השוק', 'The market'],
  topic_portfolio: ['תיקים', 'Portfolios'],
  topic_ideas: ['רעיונות', 'Ideas'],
  topic_earnings: ['דוחות', 'Earnings'],
  topic_general: ['כללי', 'General'],
  mk_open: ['המסחר פתוח', 'Market open'],
  mk_closed: ['המסחר סגור', 'Market closed'],
  mk_weekend: ['סוף שבוע', 'weekend'],
  mk_holiday: ['חג בארה"ב', 'US holiday'],
  mk_closes_in: ['נסגר בעוד {n}', 'closes in {n}'],
  mk_opens: ['נפתח {n}', 'opens {n}'],
  tr_buy: ['קנייה', 'Buy'],
  tr_buy_at: ['קנייה ב-{p}', 'Buy at {p}'],
  tr_sell: ['מכירה', 'Sell'],
  tr_sell_confirm: ['לאשר מכירה ב-{p}?', 'Confirm sell at {p}?'],
  tr_market_price: ['מחיר שוק', 'Market price'],
  tr_price_at: ['נכון ל-{t}', 'as of {t}'],
  tr_closed_note: ['אפשר לקנות ולמכור רק בשעות המסחר הרגילות בוול סטריט (9:30–16:00 שעון ניו יורק — בדרך כלל 16:30–23:00 שעון ישראל), בלי מסחר לפני או אחרי השעות. התיק נשמר גם כשהמסחר סגור.', 'Trading is allowed only during regular Wall Street hours (9:30–16:00 New York time) — no pre-market or after-hours. Your portfolio is kept while the market is closed.'],
  tr_stale: ['המחיר עדיין לא עודכן — נסו שוב בעוד דקה.', 'Price not refreshed yet — try again in a minute.'],
  tr_how: ['העסקה מתבצעת במחיר השוק העדכני של המניה. תיק דמה ללימוד — אין כסף אמיתי.', 'Trades execute at the current market price. A paper portfolio for learning — no real money.'],
  tr_bought: ['נקנתה {s} ב-{p}', 'Bought {s} at {p}'],
  tr_pick: ['חפשו מניה מ-S&P 500', 'Search an S&P 500 stock'],
  pf_open: ['פוזיציות פתוחות', 'Open positions'],
  pf_avg_ret: ['תשואה ממוצעת', 'Average return'],
  pf_realized: ['תשואה ממומשת', 'Realized return'],
  pf_win: ['עסקאות מרוויחות', 'Winning trades'],
  pf_history: ['עסקאות שנסגרו', 'Closed trades'],
  pf_bought_at: ['נקנתה ב-{p}', 'bought at {p}'],
  pf_now: ['עכשיו', 'now'],
  nw_title: ['חדשות שמזיזות את השוק', 'Market-moving news'],
  nw_sub: ['הכתבות החמות ממאות אתרי כלכלה, מדורגות לפי ההשפעה המשוערת שלהן על שוק המניות, עם הסבר פשוט מתחת לכל כותרת. סריקה מחדש כל 20 דקות.', 'The hottest stories from hundreds of financial sites, ranked by estimated impact on the stock market, with a simple explanation under each headline. Re-scanned every 20 minutes.'],
  nw_all: ['הכל', 'All'],
  nw_impact: ['השפעה', 'Impact'],
  nw_empty: ['אין עדיין חדשות בקטגוריה הזו.', 'No stories in this category yet.'],
  nw_method: ['איך מדרגים? נושא הכתבה (ריבית ואינפלציה, מכסים ומדיניות, מדדים ואנרגיה משפיעים על כל השוק), כמה אתרים מסקרים אותה, כמה היא טרייה, והאם היא נוגעת לחברות הענק. זו הערכה אוטומטית ולא ייעוץ.', 'How we rank: the topic (rates & inflation, tariffs & policy, indices and energy move the whole market), how many outlets cover it, how fresh it is, and whether it involves mega-cap companies. An automated estimate, not advice.'],
  cat_macro: ['ריבית ומאקרו', 'Rates & macro'],
  cat_policy: ['מדיניות וסחר', 'Policy & trade'],
  cat_indices: ['מדדים', 'Indices'],
  cat_earnings: ['דוחות', 'Earnings'],
  cat_energy: ['אנרגיה', 'Energy'],
  cat_geo: ['גיאופוליטיקה', 'Geopolitics'],
  cat_deals: ['עסקאות', 'Deals'],
  cat_tech: ['טכנולוגיה', 'Tech'],
  cat_crypto: ['קריפטו', 'Crypto'],
  cat_company: ['חברות', 'Companies'],
  cat_markets: ['שווקים', 'Markets'],
  lg_title: ['ליגת המסחר', 'Trading league'],
  lg_how: ['איך זה עובד', 'How it works'],
  lg_rule_cash: ['כל משתתף מקבל תיק וירטואלי עם 100,000$.', 'Every player gets a virtual $100,000 portfolio.'],
  lg_rule_trades: ['עד 4 פעולות ביום מסחר — כל קנייה או מכירה היא פעולה אחת, ועל כל פעולה נגבית עמלה של 5$.', 'Up to 4 actions per trading day — each buy or sell counts as one and costs a $5 commission.'],
  lg_rule_hours: ['מסחר רק בשעות המסחר הרגילות בוול סטריט, במחיר השוק העדכני.', 'Trades only during regular Wall Street hours, at the current market price.'],
  lg_rule_rank: ['הדירוג לפי שווי התיק (מזומן + מניות במחיר השוק). הזמינו חברים והתחרו!', 'Ranked by portfolio value (cash + stocks at market price). Invite friends and compete!'],
  lg_rules_short: ['100,000$ וירטואליים · 4 פעולות ביום · עמלה 5$ לפעולה · רק בשעות המסחר · כסף דמה ללימוד, לא ייעוץ השקעות.', 'Virtual $100,000 · 4 actions a day · $5 commission per action · regular hours only · play money for learning, not investment advice.'],
  lg_need_google: ['כדי להשתתף בליגה צריך להתחבר — עם Google או עם מייל — כך התיק והדירוג שלך נשמרים.', 'Sign in — with Google or email — to join; that keeps your portfolio and ranking.'],
  lg_pick_nick: ['בחרו כינוי לליגה', 'Pick a league nickname'],
  lg_nick_note: ['הכינוי יוצג לכל המשתתפים בטבלה (לא השם או המייל של החשבון). 2–20 תווים.', 'Shown to everyone in the standings (not your account name or email). 2–20 characters.'],
  lg_nick_ph: ['למשל: הזאב מוול סטריט', 'e.g. Wolf of Wall St'],
  lg_join: ['הצטרפות לליגה', 'Join the league'],
  lg_you_are: ['{n} · שווי התיק', '{n} · portfolio value'],
  lg_of: ['מתוך {n}', 'of {n}'],
  lg_cash: ['מזומן', 'Cash'],
  lg_trades_left: ['פעולות שנותרו היום', 'Actions left today'],
  lg_table: ['טבלת הליגה', 'Standings'],
  lg_mine: ['התיק שלי בליגה', 'My league portfolio'],
  lg_positions: ['{n} מניות בתיק', '{n} stocks held'],
  lg_no_holdings: ['עוד אין מניות בתיק. לחצו "קנייה" בזמן המסחר.', 'No stocks yet. Tap "Buy" during market hours.'],
  lg_qty_avg: ['{q} מניות · ממוצע {p}', '{q} shares · avg {p}'],
  lg_activity: ['פעולות אחרונות', 'Recent actions'],
  lg_qty: ['כמות מניות', 'Shares'],
  lg_max: ['מקסימום', 'Max'],
  lg_fee: ['עמלה {v}', 'fee {v}'],
  lg_fees_paid: ['עמלות ששולמו', 'Fees paid'],
  lg_total: ['סה"כ {v}', 'Total {v}'],
  lg_cash_after: ['מזומן אחרי: {v}', 'cash after: {v}'],
  lg_done: ['בוצע: {s}', 'Done: {s}'],
  lg_invite: ['הזמנת חברים לליגה', 'Invite friends to the league'],
  lg_invite_msg: ['בואו להתחרות איתי בליגת המסחר של VOLTIX — 100,000$ וירטואליים, 4 פעולות ביום:', 'Compete with me in the VOLTIX trading league — virtual $100,000, 4 actions a day:'],
  lg_link_copied: ['הקישור הועתק — שלחו לחברים.', 'Link copied — send it to friends.'],
  lg_leave: ['עזיבת הליגה (התיק יימחק)', 'Leave the league (portfolio is deleted)'],
  lg_leave_confirm: ['לחצו שוב לאישור עזיבה', 'Tap again to confirm leaving'],
  lg_err_generic: ['הפעולה נכשלה', 'Action failed'],
  lg_err_nickname_taken: ['הכינוי תפוס — בחרו כינוי אחר.', 'That nickname is taken — pick another.'],
  lg_err_bad_nickname: ['כינוי לא תקין (2–20 אותיות, ספרות או רווחים).', 'Invalid nickname (2–20 letters, digits or spaces).'],
  lg_err_no_trades_left: ['ניצלת את 4 הפעולות של היום. נתראה ביום המסחר הבא!', 'You used today’s 4 actions. See you next trading day!'],
  lg_err_insufficient_cash: ['אין מספיק מזומן לקנייה הזו.', 'Not enough cash for this buy.'],
  lg_err_insufficient_shares: ['אין לך מספיק מניות למכירה.', 'You don’t hold that many shares.'],
  lg_err_permission_denied: ['הפעולה נדחתה — אפשר לסחור רק בשעות המסחר ועד 4 פעולות ביום.', 'Rejected — trading is allowed only in market hours, up to 4 actions a day.'],
  login_email: ['כניסה עם מייל', 'Sign in with email'],
  login_email_sub: ['כניסה או הרשמה עם כתובת מייל וסיסמה', 'Sign in or sign up with email and password'],
  em_title_in: ['כניסה עם מייל', 'Sign in with email'],
  em_title_up: ['יצירת חשבון', 'Create an account'],
  em_title_reset: ['איפוס סיסמה', 'Reset password'],
  em_tab_in: ['יש לי חשבון', 'I have an account'],
  em_tab_up: ['חשבון חדש', 'New account'],
  em_name: ['שם (יוצג בקבוצות)', 'Name (shown in groups)'],
  em_email: ['כתובת מייל', 'Email'],
  em_password: ['סיסמה', 'Password'],
  em_pw_rule: ['לפחות 6 תווים. נשלח אליך מייל לאישור הכתובת.', 'At least 6 characters. We will email you a confirmation link.'],
  em_create: ['יצירת חשבון', 'Create account'],
  em_sign_in: ['כניסה', 'Sign in'],
  em_send_reset: ['שליחת קישור לאיפוס', 'Send reset link'],
  em_reset_sent: ['אם הכתובת רשומה, נשלח אליה קישור לאיפוס הסיסמה.', 'If that address is registered, a reset link is on its way.'],
  em_forgot: ['שכחתי סיסמה', 'Forgot password'],
  em_back: ['חזרה לכניסה', 'Back to sign in'],
  em_later: ['אמשיך בינתיים בלי', 'Continue for now'],
  em_verify_t: ['אשרו את כתובת המייל', 'Confirm your email'],
  em_verify_b: ['שלחנו קישור אישור אל {e}. לחצו עליו (בדקו גם בספאם) ואז על הכפתור כאן. קבוצות והליגה נפתחות אחרי האישור.', 'We sent a confirmation link to {e}. Click it (check spam too), then tap the button below. Groups and the league open after confirming.'],
  em_verified_btn: ['אישרתי — המשך', 'I confirmed — continue'],
  em_resend: ['שליחת המייל שוב', 'Resend email'],
  em_resent: ['נשלח שוב.', 'Sent again.'],
  em_not_yet: ['עוד לא רואים אישור — לחצו על הקישור במייל ונסו שוב.', 'Not confirmed yet — click the link in the email and try again.'],
  em_err_exists: ['כבר יש חשבון עם המייל הזה — עברו ל"יש לי חשבון".', 'An account with this email exists — switch to "I have an account".'],
  em_err_email: ['כתובת המייל לא תקינה.', 'Invalid email address.'],
  em_err_weak: ['הסיסמה חלשה מדי (לפחות 6 תווים).', 'Password too weak (at least 6 characters).'],
  em_err_cred: ['המייל או הסיסמה שגויים.', 'Wrong email or password.'],
  em_err_many: ['יותר מדי ניסיונות — נסו שוב בעוד כמה דקות.', 'Too many attempts — try again in a few minutes.'],
  em_err_disabled: ['הכניסה עם מייל עדיין לא הופעלה.', 'Email sign-in is not enabled yet.'],
  em_err_generic: ['משהו השתבש — נסו שוב.', 'Something went wrong — try again.'],
  hot_news: ['חם עכשיו', 'Hot right now'],
  hot_news_empty: ['החדשות החמות יופיעו כאן בעדכון הבא.', 'The hottest stories will appear here on the next refresh.'],
  open_article: ['פותח את הכתבה באתר המקור', 'Opens the article on the source site'],
  covered_by: ['מסוקר ב-{n} אתרים', 'Covered by {n} outlets'],
  prev_story: ['הכתבה הקודמת', 'Previous story'],
  next_story: ['הכתבה הבאה', 'Next story'],
  heat: ['חום', 'Heat'],
  rest_title: ['שאר מניות S&P 500', 'Rest of the S&P 500'],
  rest_sub: ['כל המניות מדורגות — מקום 51 ומטה', 'Every stock is ranked — #51 and below'],
  detail_loading: ['טוען ניתוח…', 'Loading analysis…'],
  unscored_note: ['אין מספיק היסטוריית מחירים כדי לחשב ציון למניה הזו (נדרשת כשנה).', 'Not enough price history to score this stock (about a year is needed).'],
  // account
  ob_choose: ['איך תרצו להיכנס?', 'How would you like to continue?'],
  login_google: ['כניסה עם Google', 'Continue with Google'],
  login_google_sub: ['התיק ורשימת המעקב נשמרים בחשבון ומסונכרנים בין מכשירים', 'Portfolio and watchlist are saved to your account and synced across devices'],
  login_guest: ['המשך ללא הרשמה', 'Continue without signing up'],
  login_guest_sub: ['הנתונים נשמרים רק במכשיר הזה', 'Data stays on this device only'],
  login_unavailable: ['כניסה עם Google עדיין לא הופעלה באפליקציה', 'Google sign-in is not enabled yet'],
  login_check_first: ['יש לסמן את תיבת האישור לפני הכניסה', 'Please tick the confirmation box first'],
  st_account: ['חשבון', 'Account'],
  st_guest: ['אורח — הנתונים נשמרים במכשיר בלבד', 'Guest — data stays on this device'],
  st_signed_in: ['מחובר כ-{n}', 'Signed in as {n}'],
  st_sign_in: ['כניסה עם Google', 'Sign in with Google'],
  st_sign_out: ['התנתקות', 'Sign out'],
  st_delete_account: ['מחיקת החשבון וכל הנתונים', 'Delete account and all data'],
  st_delete_account_b: ['החשבון, התיק ורשימת המעקב יימחקו לצמיתות מהמכשיר ומהענן.', 'Your account, portfolio and watchlist will be permanently deleted from this device and the cloud.'],
  st_a11y: ['הצהרת נגישות', 'Accessibility statement'],
} as const;

export type Key = keyof typeof D;

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  const e = D[key];
  if (!e) return key; // unknown key (e.g. dynamic error codes) — caller decides the fallback
  let s: string = e[lang === 'he' ? 0 : 1];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const lang = useLang((s) => s.lang);
  return Object.assign((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), { lang });
}

// ---------- Engine-generated text (the engine writes Hebrew) ----------

const SECTOR: Record<string, [string, string]> = {
  Technology: ['טכנולוגיה', 'Technology'],
  'Communication Services': ['תקשורת', 'Communication'],
  'Consumer Cyclical': ['צריכה מחזורית', 'Consumer Cyclical'],
  'Consumer Defensive': ['צריכה בסיסית', 'Consumer Staples'],
  'Financial Services': ['פיננסים', 'Financials'],
  Healthcare: ['בריאות', 'Healthcare'],
  Energy: ['אנרגיה', 'Energy'],
  Industrials: ['תעשייה', 'Industrials'],
  'Basic Materials': ['חומרי גלם', 'Materials'],
  'Real Estate': ['נדל"ן', 'Real Estate'],
  Utilities: ['תשתיות', 'Utilities'],
  Other: ['אחר', 'Other'],
};
export const sectorName = (s: string, lang: Lang) => SECTOR[s]?.[lang === 'he' ? 0 : 1] ?? s;

const FACTOR_LABEL_EN: Record<string, string> = {
  earnings: 'Upcoming quarterly report (risk)',
  sma200: 'Price above 200-day MA',
  golden: '50-day MA above 200-day MA',
  sma100: 'Distance from 100-day MA',
  candles: 'Red candles before last green day',
  rsi: 'RSI(14)',
  macd: 'MACD',
  volume: 'Volume vs. 20-day avg.',
  pe: 'P/E vs. sector',
  peg: 'PEG (P/E to growth)',
  rev: 'Revenue growth (YoY)',
  eps: 'EPS growth',
  margin: 'Net margin vs. sector',
  de: 'Debt to equity',
  fcf: 'Free-cash-flow yield',
  roe: 'Return on equity (ROE)',
  net: 'Net sentiment (7 days)',
  pos: 'Positive articles',
  neg: 'Negative articles',
  src: 'Major outlets covering',
};

const VALUE_EN: [RegExp, string][] = [
  [/^בעוד (\d+) ימים$/, 'in $1 days'],
  [/^היום$/, 'today'],
  [/^מחר$/, 'tomorrow'],
  [/^לא ידוע \/ רחוק$/, 'unknown / far'],
  [/אין נתון/g, 'n/a'],
  [/^כן$/, 'Yes'],
  [/^לא$/, 'No'],
  [/הפסדית/g, 'Loss-making'],
  [/ענף/g, 'sector'],
  [/(\d+) אדומים ← ירוק/g, '$1 red → green'],
  [/היום האחרון אינו ירוק/g, 'Last day not green'],
  [/יציאה ממכירת יתר/g, 'leaving oversold'],
  [/אזור מאוזן/g, 'balanced'],
  [/מומנטום חזק/g, 'strong momentum'],
  [/קניית יתר/g, 'overbought'],
  [/חלש/g, 'weak'],
  [/חצייה כלפי מעלה/g, 'bullish cross'],
  [/משתפר/g, 'improving'],
  [/נחלש/g, 'weakening'],
  [/משניים/g, 'secondary'],
];

export function factorLabel(f: Factor, lang: Lang) {
  return lang === 'he' ? f.label : FACTOR_LABEL_EN[f.key] ?? f.label;
}
export function factorValue(f: Factor, lang: Lang) {
  if (lang === 'he') return f.value;
  return VALUE_EN.reduce((s, [re, to]) => s.replace(re, to), f.value);
}

export function levelsMethod(m: string, lang: Lang) {
  if (lang === 'he') return m;
  return m
    .replace('סטופ: 2×ATR מתחת למחיר', 'Stop: 2×ATR below price')
    .replace('סטופ: מתחת לממוצע 100', 'Stop: below the 100-day MA')
    .replace('יעד: שיא 60 יום (התנגדות)', 'Target: 60-day high (resistance)')
    .replace('יעד: שיא 52 שבועות (התנגדות)', 'Target: 52-week high (resistance)')
    .replace('יעד: יחס סיכוי/סיכון 1:2', 'Target: 1:2 risk/reward');
}

const fk = (p: PillarResult, k: string) => p.factors.find((f) => f.key === k);

/** English summaries, rebuilt from the factor table (same rules the engine uses in Hebrew). */
export function pillarSummary(kind: 'technical' | 'fundamental', p: PillarResult, sector: string, lang: Lang) {
  if (lang === 'he') return p.summary;
  const raw = p.factors.reduce((a, f) => a + f.points, 0);
  const s: string[] = [];
  if (kind === 'technical') {
    const up = (fk(p, 'sma200')?.points ?? 0) > 0 && (fk(p, 'golden')?.points ?? 0) > 0;
    s.push(up ? 'Long-term uptrend (above the 200-day MA, with the 50-day above it).' : (fk(p, 'sma200')?.points ?? 0) > 0 ? 'Price is above the 200-day MA, but the averages have not confirmed a full uptrend.' : 'Price is below the 200-day MA — the long-term trend is weak.');
    if ((fk(p, 'sma100')?.points ?? 0) >= 12) s.push(`Price is approaching the 100-day MA (${fk(p, 'sma100')!.value}), often a support zone.`);
    if ((fk(p, 'candles')?.points ?? 0) >= 14) s.push(`Possible reversal pattern: ${factorValue(fk(p, 'candles')!, 'en')}.`);
    if (fk(p, 'rsi')?.points === 0) s.push('RSI signals overbought — correction risk.');
    s.push(raw >= 70 ? 'Positive technical picture.' : raw >= 45 ? 'Mixed technical picture.' : 'Weak technical picture.');
  } else {
    const sec = sectorName(sector, 'en');
    const pe = fk(p, 'pe');
    if (pe?.value === 'הפסדית') s.push('The company is currently unprofitable, so P/E is not meaningful.');
    else if ((pe?.points ?? 0) >= 20) s.push(`Attractive valuation vs. the ${sec} sector: P/E ${factorValue(pe!, 'en')}.`);
    else if ((pe?.points ?? 0) <= 7) s.push(`Rich valuation vs. the ${sec} sector: P/E ${factorValue(pe!, 'en')}.`);
    else s.push(`Valuation in line with the ${sec} sector.`);
    if ((fk(p, 'rev')?.points ?? 0) >= 11) s.push(`Revenue is growing ${fk(p, 'rev')!.value}, above the sector.`);
    else if (fk(p, 'rev')?.points === 0) s.push('Revenue is shrinking.');
    if ((fk(p, 'de')?.points ?? 10) <= 3) s.push('Leverage is relatively high.');
    if ((fk(p, 'fcf')?.points ?? 0) >= 7) s.push('Healthy free cash flow.');
    const ern = fk(p, 'earnings');
    if (ern && ern.points < 0) s.push(`Quarterly report due ${factorValue(ern, 'en')} — score cut by ${-ern.points} pts for event risk.`);
    s.push(raw >= 65 ? 'Strong fundamental profile.' : raw >= 40 ? 'Reasonable fundamental profile.' : 'Weak fundamental profile.');
  }
  return s.join(' ');
}

export function sentimentSummary(r: SentimentResult, lang: Lang) {
  if (lang === 'he') return r.summary;
  if (!r.articles.length) return 'No meaningful coverage from the main news sources in the past week — neutral score.';
  if (r.negative === 0 && r.positive > 0) return `Coverage this week is entirely positive (${r.positive} positive, no negative articles).`;
  if (r.negative >= r.positive) return `Significant negative news (${r.negative} negative vs. ${r.positive} positive) — this third scores low.`;
  return `Coverage is mostly positive (${r.positive} positive, ${r.negative} negative, ${r.neutral} neutral).`;
}

/**
 * One-sentence, kid-level explanation of how a headline may affect the market or the stock (Hebrew + English).
 * Rule-based: topic (from marketnews TOPICS) × direction words in the headline. Written as "usually / may",
 * never as a prediction. (With an ANTHROPIC_API_KEY this could be generated per story instead.)
 */
export type Dir = 'up' | 'down' | 'neutral';

const UP = /\b(rise[sn]?|rising|jump(s|ed)?|surg(e|es|ed|ing)|soar(s|ed|ing)?|rall(y|ies|ied)|gain(s|ed)?|beat(s)?|tops?|record high|upgrade[sd]?|boost(s|ed)?|approv(e|es|ed|al)|strong(er)?|raises? (guidance|forecast|outlook)|cut(s)? rates?|rate cuts?|cools?|cooling|eas(e|es|ed|ing)|rebound(s|ed)?|recover(s|y|ed)?|ceasefire|agreement|deal reached|truce|climb(s|ed)?|higher)\b/i;
const DOWN = /\b(fall(s|ing)?|fell|drop(s|ped)?|slump(s|ed)?|plung(e|es|ed)|tumbl(e|es|ed)|sink(s)?|sank|slid(e|es)?|miss(es|ed)?|downgrade[sd]?|hike[sd]?|hot(ter)?|cut(s)? (guidance|forecast|outlook)|lower(s|ed)? (guidance|forecast|outlook)|warn(s|ed|ing)?|weak(er|ness)?|loss(es)?|layoffs?|lawsuit|probe|investigation|fine[sd]?|recall(s|ed)?|bankrupt(cy)?|shutdown|tariffs?|sanctions?|selloff|sell-off|slowdown|recession|lower|plunge|crash(es|ed)?|strike|war)\b/i;

export function direction(title: string): Dir {
  const u = (title.match(new RegExp(UP, 'gi')) ?? []).length;
  const d = (title.match(new RegExp(DOWN, 'gi')) ?? []).length;
  return u > d ? 'up' : d > u ? 'down' : 'neutral';
}

type T3 = Record<Dir, [string, string]>; // [he, en]; {X} = ticker or "the company"

const TEMPLATES: Record<string, T3> = {
  macro: {
    up: ['כשהריבית יורדת או האינפלציה נרגעת, ללוות כסף נהיה זול יותר לחברות — ולכן שוק המניות בדרך כלל שמח ועולה.', 'When rates fall or inflation cools, borrowing gets cheaper for companies — so stocks usually like it and go up.'],
    down: ['כשהריבית עולה או האינפלציה חמה, כסף נהיה יקר יותר — וזה בדרך כלל לוחץ את המניות למטה.', 'When rates rise or inflation runs hot, money gets more expensive — which usually pushes stocks down.'],
    neutral: ['ריבית ואינפלציה קובעות כמה יקר ללוות כסף, ולכן הן משפיעות כמעט על כל המניות בשוק.', 'Rates and inflation decide how expensive it is to borrow, so they move almost every stock.'],
  },
  policy: {
    up: ['הסכם או הקלה מצד הממשלה מורידים אי־ודאות — ומשקיעים בדרך כלל מגיבים בקניות ובעליות.', 'A deal or relief from the government removes uncertainty — investors usually respond by buying.'],
    down: ['מכסים, קנסות או הגבלות מייקרים לחברות את העסקים — ולכן המניות עלולות לרדת.', 'Tariffs, fines or restrictions make business more expensive for companies — so stocks may fall.'],
    neutral: ['החלטות של הממשלה והרגולטורים יכולות לשנות לחברות את חוקי המשחק, ולכן השוק עוקב אחריהן מקרוב.', 'Government and regulator decisions can change the rules for companies, so the market watches them closely.'],
  },
  indices: {
    up: ['כשהמדדים הגדולים עולים, רוב המניות עולות יחד איתם — כמו גאות שמרימה את כל הסירות.', 'When the big indices rise, most stocks rise with them — like a tide lifting all boats.'],
    down: ['כשהמדדים הגדולים יורדים, רוב המניות נגררות למטה יחד איתם.', 'When the big indices fall, most stocks get dragged down with them.'],
    neutral: ['המדדים הגדולים מראים את מצב הרוח של כל השוק בבת אחת.', 'The big indices show the mood of the whole market at once.'],
  },
  energy: {
    up: ['נפט יקר יותר טוב לחברות האנרגיה, אבל מייקר דלק לחברות התעופה ולכולנו.', 'Pricier oil is good for energy companies but makes fuel more expensive for airlines and everyone else.'],
    down: ['נפט זול יותר חוסך כסף לחברות ולצרכנים, אבל מקטין את הרווחים של חברות הנפט.', 'Cheaper oil saves money for companies and shoppers, but shrinks oil companies’ profits.'],
    neutral: ['מחיר הנפט משפיע על עלויות של המון חברות, ולכן הוא חשוב לכל השוק.', 'The oil price affects costs for lots of companies, so it matters to the whole market.'],
  },
  geo: {
    up: ['רגיעה בעולם מורידה פחד, ומשקיעים חוזרים לקנות מניות.', 'Calmer world news lowers fear, so investors come back to buy stocks.'],
    down: ['מתיחות בעולם מפחידה משקיעים, ולפעמים הם בורחים ממניות לנכסים בטוחים כמו זהב.', 'Global tension scares investors, and sometimes they run from stocks to safe assets like gold.'],
    neutral: ['אירועים בעולם יכולים להפחיד או להרגיע משקיעים, ולכן הם מזיזים את השוק.', 'World events can scare or calm investors, so they move the market.'],
  },
  earnings: {
    up: ['{X} הרוויחה יותר מהצפוי — וכשחברה מרוויחה יותר, המניה שלה בדרך כלל עולה.', '{X} earned more than expected — and when a company earns more, its stock usually rises.'],
    down: ['{X} הרוויחה פחות מהצפוי — ולכן המניה עלולה לרדת כי המשקיעים מאוכזבים.', '{X} earned less than expected — so the stock may fall because investors are disappointed.'],
    neutral: ['הדוח של {X} מראה למשקיעים כמה טוב העסק הולך, וזה מה שקובע לאן המניה תזוז.', '{X}’s report shows investors how well the business is doing, which decides where the stock moves.'],
  },
  deals: {
    up: ['עסקה גדולה בדרך כלל מקפיצה את המניה של החברה שנקנית, כי הקונה משלם יותר ממחיר השוק.', 'A big deal usually lifts the stock of the company being bought, because the buyer pays above market price.'],
    down: ['כשעסקה נתקעת או מתבטלת, המניות של החברות המעורבות עלולות לרדת.', 'When a deal stalls or is cancelled, the stocks involved may fall.'],
    neutral: ['עסקאות קנייה ומיזוג משנות את גודל החברות, ולכן משקיעים מגיבים אליהן מהר.', 'Mergers and acquisitions change how big companies are, so investors react quickly.'],
  },
  tech: {
    up: ['חדשות טובות על בינה מלאכותית ושבבים מושכות משקיעים לקנות מניות טכנולוגיה.', 'Good news about AI and chips pulls investors into tech stocks.'],
    down: ['חדשות רעות בתחום הטכנולוגיה יכולות להוריד את מניות הטכנולוגיה, שהן חלק גדול מהשוק.', 'Bad tech news can pull down tech stocks, which are a big part of the market.'],
    neutral: ['מניות הטכנולוגיה הן חלק גדול מהשוק, ולכן חדשות עליהן מזיזות את כולו.', 'Tech stocks are a big part of the market, so news about them moves everything.'],
  },
  crypto: {
    up: ['עליות בקריפטו עוזרות בעיקר לחברות שמחזיקות או סוחרות במטבעות דיגיטליים.', 'Crypto gains mostly help companies that hold or trade digital coins.'],
    down: ['ירידות בקריפטו פוגעות בעיקר בחברות שמחזיקות או סוחרות במטבעות דיגיטליים.', 'Crypto drops mostly hurt companies that hold or trade digital coins.'],
    neutral: ['תנודות בקריפטו משפיעות בעיקר על חברות שקשורות למטבעות דיגיטליים.', 'Crypto swings mostly affect companies tied to digital coins.'],
  },
  company: {
    up: ['חדשות טובות על {X} גורמות למשקיעים לרצות לקנות — והמניה עשויה לעלות.', 'Good news about {X} makes investors want to buy — the stock may rise.'],
    down: ['חדשות רעות על {X} גורמות למשקיעים למכור — והמניה עלולה לרדת.', 'Bad news about {X} makes investors sell — the stock may fall.'],
    neutral: ['חדשות על {X} יכולות לשנות את מה שמשקיעים חושבים על החברה, ולכן גם את מחיר המניה.', 'News about {X} can change what investors think of the company, and so its stock price.'],
  },
  markets: {
    up: ['חדשות טובות על הכלכלה גורמות למשקיעים להיות אופטימיים — ומניות נוטות לעלות.', 'Good economic news makes investors optimistic — stocks tend to rise.'],
    down: ['חדשות רעות על הכלכלה גורמות למשקיעים לדאוג — ומניות נוטות לרדת.', 'Bad economic news makes investors worry — stocks tend to fall.'],
    neutral: ['חדשות כלכליות משנות את מצב הרוח של המשקיעים, וזה מזיז את מחירי המניות.', 'Economic news changes investors’ mood, which moves stock prices.'],
  },
};

export function explain(title: string, category: string | undefined, tickers: string[]): { he: string; en: string; dir: Dir } {
  const dir = direction(title);
  const t = TEMPLATES[category ?? 'markets'] ?? TEMPLATES.markets;
  const [he, en] = t[dir];
  const x = tickers[0];
  return {
    dir,
    he: he.replace('{X}', x ? `החברה (${x})` : 'החברה'),
    en: en.replace('{X}', x ?? 'the company'),
  };
}

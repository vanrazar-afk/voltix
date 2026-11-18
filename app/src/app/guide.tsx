import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors, space } from '@/lib/theme';
import { T, Row, Card, SectionTitle, Disclaimer } from '@/components/ui';
import { useT } from '@/lib/i18n';

type L = { he: string; en: string };
const L = (he: string, en: string): L => ({ he, en });

const PILLARS = [
  {
    icon: 'trending-up' as const,
    color: colors.tech,
    title: L('טכני · 50 נקודות', 'Technical · 50 points'),
    items: [
      L('מגמה (18): מעל ממוצע 200 · ממוצע 50 מעל 200 · ממוצע 200 עולה · מעל ממוצע 50', 'Trend (18): above the 200-day · 50-day over 200-day · 200-day rising · above the 50-day'),
      L('חוזק (10): ביצועי 6 חודשים מול שאר S&P 500 · MACD מתחזק', 'Strength (10): 6-month performance vs the rest of the S&P 500 · MACD rising'),
      L('תזמון (16): קרוב לממוצע 20 = כניסה טובה · RSI מאוזן · 3 ימי עלייה ברצף = מרדף, 0 נקודות', 'Timing (16): near the 20-day = good entry · balanced RSI · 3+ straight up days = chasing, 0 points'),
      L('לחץ קנייה (6): מחזור בימי עלייה מול ימי ירידה', 'Buying pressure (6): volume on up days vs down days'),
    ],
  },
  {
    icon: 'bar-chart-2' as const,
    color: colors.fund,
    title: L('פונדמנטלי · 30 נקודות', 'Fundamental · 30 points'),
    items: [
      L('תמחור (10): מכפיל רווח מול הענף · PEG', 'Valuation (10): P/E vs the sector · PEG'),
      L('צמיחה (10): הכנסות · רווח למניה', 'Growth (10): revenue · earnings per share'),
      L('איכות (10): שולי רווח · ROE · תזרים חופשי · חוב', 'Quality (10): margins · ROE · free cash flow · debt'),
      L('דוח רבעוני קרוב מוריד עד חצי מהציון (סיכון)', 'An upcoming quarterly report cuts up to half (event risk)'),
    ],
  },
  {
    icon: 'message-circle' as const,
    color: colors.sent,
    title: L('סנטימנט · 20 נקודות', 'Sentiment · 20 points'),
    items: [
      L('חדשות 7 ימים מעשרות אתרי כלכלה', 'Last 7 days of news from dozens of financial sites'),
      L('רק חדשות טובות = 20 · חדשות רעות דומיננטיות = עד 4', 'Only good news = 20 · dominant bad news = up to 4'),
    ],
  },
];

const GLOSSARY: [L, L][] = [
  [L('ממוצע נע (SMA)', 'Moving average (SMA)'), L('ממוצע מחירי הסגירה של N הימים האחרונים. ממוצעים 50/100/200 משמשים לזיהוי מגמה ותמיכה.', 'Average closing price of the last N days. 50/100/200-day averages show trend and support.')],
  [L('RSI', 'RSI'), L('מדד עוצמה יחסית בין 0 ל-100. מעל 70 נחשב קניית יתר, מתחת ל-30 מכירת יתר.', 'Relative strength index from 0 to 100. Above 70 is overbought, below 30 oversold.')],
  [L('MACD', 'MACD'), L('הפרש בין ממוצעים נעים אקספוננציאליים, מסמן שינויי מומנטום.', 'Difference between exponential moving averages; flags momentum shifts.')],
  [L('ATR', 'ATR'), L('טווח תנועה יומי ממוצע — משמש לחישוב מרחק הסטופ והיעד.', 'Average daily range — used to size the stop and target distance.')],
  [L('P/E', 'P/E'), L('מחיר המניה חלקי הרווח למניה. משווים אותו לענף שבו החברה פועלת.', 'Share price divided by earnings per share, compared with the company’s sector.')],
  [L('PEG', 'PEG'), L('מכפיל הרווח חלקי קצב צמיחת הרווח. מתחת ל-1 נחשב זול ביחס לצמיחה.', 'P/E divided by earnings growth. Below 1 is considered cheap for its growth.')],
  [L('יחס סיכוי/סיכון', 'Risk/reward'), L('המרחק ליעד חלקי המרחק לסטופ. 1:2 = פוטנציאל כפול מהסיכון.', 'Distance to target divided by distance to stop. 1:2 = twice the potential of the risk.')],
];

const TEXT = {
  title: L('איך מחושב הציון', 'How the score works'),
  intro: L('כל מניה ב-S&P 500 מקבלת ציון 1–100: טכני 50, פונדמנטלי 30, סנטימנט 20. במסחר — עדכון כל 5 דקות.', 'Every S&P 500 stock gets a 1–100 score: technical 50, fundamental 30, sentiment 20. Updated every 5 minutes in market hours.'),
  levelsT: L('יעד יציאה וסטופ', 'Exit target & stop'),
  levels: L('סטופ: 2×ATR מתחת למחיר. יעד: ההתנגדות הקרובה, לפחות פי 1.5 מהסיכון. רמות מחקר — לא תחזית.', 'Stop: 2×ATR below price. Target: the nearest resistance, at least 1.5× the risk. Research levels — not a forecast.'),
  glossT: L('מילון מונחים', 'Glossary'),
  limitsT: L('מגבלות המודל', 'Model limitations'),
  limits: L('נתוני עבר וכללים קבועים. לא צופה הפתעות ולא מכיר את המצב האישי שלכם. ציון גבוה אינו הבטחה.', 'Past data and fixed rules. It cannot foresee surprises and does not know your situation. A high score is no guarantee.'),
};

export default function Learn() {
  const { lang } = useT();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12) }}>
        <View>
          <T w="black" size={26}>{TEXT.title[lang]}</T>
          <T size={14} color={colors.textDim}>{TEXT.intro[lang]}</T>
        </View>
        {PILLARS.map((p) => (
          <Card key={p.title.en}>
            <SectionTitle title={p.title[lang]} icon={p.icon} color={p.color} />
            {p.items.map((i) => (
              <Row key={i.en} style={{ gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.color, marginTop: 8 }} />
                <T size={14} style={{ flex: 1 }}>{i[lang]}</T>
              </Row>
            ))}
          </Card>
        ))}
        <Card>
          <SectionTitle title={TEXT.levelsT[lang]} icon="crosshair" color={colors.brand2} />
          <T size={14} color={colors.textDim}>
            {TEXT.levels[lang]}
          </T>
        </Card>
        <Card>
          <SectionTitle title={TEXT.glossT[lang]} icon="book" />
          {GLOSSARY.map(([k, v], i) => (
            <Pressable key={k.en} onPress={() => setOpen(open === i ? null : i)} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T w="bold">{k[lang]}</T>
                <Feather name={open === i ? 'minus' : 'plus'} size={16} color={colors.textDim} />
              </Row>
              {open === i && <T size={13} color={colors.textDim} style={{ marginTop: 6 }}>{v[lang]}</T>}
            </Pressable>
          ))}
        </Card>
        <Card>
          <SectionTitle title={TEXT.limitsT[lang]} icon="alert-circle" color={colors.warn} />
          <T size={14} color={colors.textDim}>
            {TEXT.limits[lang]}
          </T>
        </Card>
        <Disclaimer />
      </ScrollView>
    </SafeAreaView>
  );
}

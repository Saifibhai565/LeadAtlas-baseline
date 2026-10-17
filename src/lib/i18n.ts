/**
 * Lightweight bilingual text. The app is English by default; a user can switch to Urdu.
 * Add keys as screens are translated — any missing key falls back to its English default,
 * so nothing ever breaks while translation is in progress.
 */
export type Lang = "en" | "ur";

export const STRINGS: Record<string, { en: string; ur: string }> = {
  // Navigation
  "nav.dashboard": { en: "Dashboard", ur: "ڈیش بورڈ" },
  "nav.searches": { en: "Searches", ur: "تلاش" },
  "nav.watches": { en: "Watches", ur: "نگرانی" },
  "nav.leads": { en: "Leads", ur: "لیڈز" },
  "nav.enrich": { en: "Website checks", ur: "ویب سائٹ جانچ" },
  "nav.rank": { en: "Rank tracker", ur: "رینک ٹریکر" },
  "nav.extract": { en: "Web extractor", ur: "ویب ایکسٹریکٹر" },
  "nav.pipeline": { en: "Pipeline", ur: "پائپ لائن" },
  "nav.inbox": { en: "WhatsApp inbox", ur: "واٹس ایپ ان باکس" },
  "nav.campaigns": { en: "WhatsApp & SMS", ur: "واٹس ایپ اور ایس ایم ایس" },
  "nav.outreach": { en: "Email outreach", ur: "ای میل آؤٹ ریچ" },
  "nav.bulkEmail": { en: "Bulk email", ur: "بلک ای میل" },
  "nav.bulkSms": { en: "Bulk SMS", ur: "بلک ایس ایم ایس" },
  "nav.deliverability": { en: "Deliverability", ur: "ڈیلیوری بلٹی" },
  "nav.analytics": { en: "Analytics", ur: "تجزیات" },
  "nav.competitors": { en: "Competitor watch", ur: "حریف نگرانی" },
  "nav.templates": { en: "Templates", ur: "ٹیمپلیٹس" },
  "nav.sites": { en: "Websites", ur: "ویب سائٹس" },
  "nav.team": { en: "Team", ur: "ٹیم" },
  "nav.billing": { en: "Billing", ur: "بلنگ" },
  "nav.developers": { en: "API and extension", ur: "API اور ایکسٹینشن" },
  "nav.settings": { en: "Settings", ur: "ترتیبات" },
  "nav.help": { en: "Help center", ur: "مدد" },
  "nav.website": { en: "View website", ur: "ویب سائٹ دیکھیں" },
  "nav.admin": { en: "Super Admin", ur: "سپر ایڈمن" },
  "nav.account": { en: "Account", ur: "اکاؤنٹ" },

  // Top bar
  "top.search": { en: "Search or jump to…", ur: "تلاش کریں یا جائیں…" },
  "top.online": { en: "Engine online", ur: "انجن آن لائن" },
  "top.offline": { en: "Engine offline", ur: "انجن آف لائن" },
  "top.credits": { en: "credits", ur: "کریڈٹس" },
  "top.lightMode": { en: "Light mode", ur: "روشن موڈ" },
  "top.darkMode": { en: "Dark mode", ur: "تاریک موڈ" },

  // Common buttons
  "btn.save": { en: "Save", ur: "محفوظ کریں" },
  "btn.cancel": { en: "Cancel", ur: "منسوخ" },
  "btn.delete": { en: "Delete", ur: "حذف کریں" },
  "btn.add": { en: "Add", ur: "شامل کریں" },
  "btn.export": { en: "Export", ur: "ایکسپورٹ" },
  "btn.send": { en: "Send", ur: "بھیجیں" },
  "btn.search": { en: "Search", ur: "تلاش کریں" },
  "btn.newSearch": { en: "New search", ur: "نئی تلاش" },
  "btn.upgrade": { en: "See plans", ur: "پلانز دیکھیں" },

  // Dashboard
  "dash.radar": { en: "Live lead radar", ur: "لائیو لیڈ ریڈار" },
  "dash.welcome": { en: "Welcome back", ur: "خوش آمدید" },
  "dash.onMap": { en: "leads on your map", ur: "آپ کے نقشے پر لیڈز" },
  "dash.thisWeek": { en: "this week", ur: "اس ہفتے" },
  "dash.hot": { en: "hot leads (70+)", ur: "بہترین لیڈز (70+)" },
  "dash.due": { en: "follow-ups due", ur: "فالو اپ باقی" },
  "dash.findNew": { en: "Find new leads", ur: "نئی لیڈز تلاش کریں" },
  "dash.contactBest": { en: "Contact the best ones", ur: "بہترین سے رابطہ کریں" },

  // Settings
  "set.language": { en: "Language", ur: "زبان" },
  "set.languageHint": { en: "Choose the language for the app. Messages you send can be written in any language.", ur: "ایپ کی زبان منتخب کریں۔ آپ جو پیغامات بھیجتے ہیں وہ کسی بھی زبان میں لکھے جا سکتے ہیں۔" },
  "set.english": { en: "English", ur: "انگریزی" },
  "set.urdu": { en: "Urdu", ur: "اردو" },
};

/** Builds a translator for a language. t("nav.leads") -> localized string, with English fallback. */
export function translator(lang: Lang) {
  return (key: string, fallback?: string) => STRINGS[key]?.[lang] ?? fallback ?? STRINGS[key]?.en ?? key;
}

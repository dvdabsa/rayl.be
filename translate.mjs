/**
 * Rayl translation pipeline.
 *
 * Reads every HTML file in the project root, sends the visible strings to the
 * DeepL API, and writes translated copies into nl/ and fr/ subfolders.
 *
 * Usage:
 *   1. cp .env.example .env  (and put your DeepL key in there)
 *   2. npm install
 *   3. npm run translate
 *
 * Re-run any time you change content; it overwrites nl/ and fr/.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.DEEPL_API_KEY;

if (!API_KEY || API_KEY === "your-key-here") {
  console.error(
    "Missing DEEPL_API_KEY. Copy .env.example to .env and add your key from https://deepl.com/pro-api"
  );
  process.exit(1);
}

const API_URL = API_KEY.endsWith(":fx")
  ? "https://api-free.deepl.com/v2/translate"
  : "https://api.deepl.com/v2/translate";

const TARGET_LANGS = [
  { code: "NL", folder: "nl", htmlLang: "nl" },
  { code: "FR", folder: "fr", htmlLang: "fr" },
];

// Folders we don't translate FROM; auth pages are noindex but still translated.
const HTML_FILES = readdirSync(__dirname).filter((f) => f.endsWith(".html"));

// Don't peek inside these tags.
const NO_TRANSLATE_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "code",
  "pre",
  "svg",
]);

const TRANSLATABLE_ATTRS = ["alt", "title", "placeholder", "aria-label"];
const TRANSLATABLE_META_NAMES = new Set([
  "description",
  "keywords",
  "twitter:title",
  "twitter:description",
]);
const TRANSLATABLE_META_PROPS = new Set([
  "og:title",
  "og:description",
  "og:site_name",
]);

// Asset filenames that live at the project root and need ../ when moved into nl/ or fr/.
const ASSET_FILES = new Set([
  "styles.css",
  "script.js",
  "favicon.png",
  "favicon.svg",
  "og-image.png",
  "dashboard-preview.png",
  "Aeonik-BoldItalic.otf",
]);
const ASSET_DIRS = ["partners/", "assets/"];

function isAssetPath(p) {
  if (!p) return false;
  if (/^(https?:|mailto:|tel:|#|\/\/|data:)/.test(p)) return false;
  if (p.startsWith("/")) return false;
  const cleaned = p.split("?")[0].split("#")[0];
  if (ASSET_FILES.has(cleaned)) return true;
  if (ASSET_DIRS.some((d) => cleaned.startsWith(d))) return true;
  return false;
}

function splitWhitespace(text) {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return { lead: match[1] || "", body: match[2] || "", trail: match[3] || "" };
}

function collectTextNodes(node, out = []) {
  if (!node) return out;
  if (node.nodeType === 1) {
    const tag = node.tagName?.toLowerCase();
    if (NO_TRANSLATE_TAGS.has(tag)) return out;
    for (const child of node.childNodes) collectTextNodes(child, out);
    return out;
  }
  if (node.nodeType === 3) {
    const raw = node.rawText;
    if (raw && /\S/.test(raw) && /[A-Za-z]/.test(raw)) {
      out.push(node);
    }
  }
  return out;
}

function collectAttrs(node, out = []) {
  if (!node || node.nodeType !== 1) return out;
  const tag = node.tagName?.toLowerCase();
  if (NO_TRANSLATE_TAGS.has(tag)) return out;

  if (tag === "meta") {
    const name = node.getAttribute("name");
    const prop = node.getAttribute("property");
    const content = node.getAttribute("content");
    if (
      content &&
      (TRANSLATABLE_META_NAMES.has(name) || TRANSLATABLE_META_PROPS.has(prop))
    ) {
      out.push({ node, attr: "content", text: content });
    }
    return out;
  }

  for (const attr of TRANSLATABLE_ATTRS) {
    const val = node.getAttribute(attr);
    if (val && /\S/.test(val) && /[A-Za-z]/.test(val)) {
      out.push({ node, attr, text: val });
    }
  }

  for (const child of node.childNodes) collectAttrs(child, out);
  return out;
}

async function deeplTranslate(texts, targetLang) {
  if (texts.length === 0) return [];
  const results = [];
  for (let i = 0; i < texts.length; i += 50) {
    const chunk = texts.slice(i, i + 50);
    const params = new URLSearchParams();
    for (const t of chunk) params.append("text", t);
    params.append("target_lang", targetLang);
    params.append("source_lang", "EN");
    params.append("preserve_formatting", "1");
    params.append("tag_handling", "html");

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepL ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    results.push(...json.translations.map((t) => t.text));
  }
  return results;
}

function rewritePaths(root, langFolder) {
  function walk(node) {
    if (!node || node.nodeType !== 1) return;

    const href = node.getAttribute("href");
    if (href) {
      if (isAssetPath(href)) {
        node.setAttribute("href", "../" + href);
      } else if (
        href.startsWith("https://rayl.be/") &&
        node.getAttribute("rel") === "canonical"
      ) {
        node.setAttribute(
          "href",
          href.replace("https://rayl.be/", `https://rayl.be/${langFolder}/`)
        );
      } else if (
        href.startsWith("https://rayl.be/") &&
        node.tagName?.toLowerCase() === "meta"
      ) {
        // og:url type
        node.setAttribute(
          "href",
          href.replace("https://rayl.be/", `https://rayl.be/${langFolder}/`)
        );
      }
    }

    const content = node.getAttribute("content");
    if (
      content &&
      content.startsWith("https://rayl.be/") &&
      node.tagName?.toLowerCase() === "meta"
    ) {
      const prop = node.getAttribute("property") || node.getAttribute("name");
      if (prop === "og:url") {
        node.setAttribute(
          "content",
          content.replace(
            "https://rayl.be/",
            `https://rayl.be/${langFolder}/`
          )
        );
      }
    }

    const src = node.getAttribute("src");
    if (src && isAssetPath(src)) {
      node.setAttribute("src", "../" + src);
    }

    for (const child of node.childNodes) walk(child);
  }
  walk(root);
}

function rewriteLangSwitchers(root, currentHtmlLang) {
  const groups = [
    ...root.querySelectorAll(".lang-switch"),
    ...root.querySelectorAll(".mobile-lang"),
  ];
  for (const group of groups) {
    const links = group.querySelectorAll("a");
    for (const a of links) {
      const lang = a.getAttribute("hreflang");
      // reset state
      a.removeAttribute("aria-current");
      const classAttr = (a.getAttribute("class") || "")
        .split(/\s+/)
        .filter((c) => c && c !== "is-active")
        .join(" ");
      if (classAttr) a.setAttribute("class", classAttr);
      else a.removeAttribute("class");

      if (lang === currentHtmlLang) {
        a.setAttribute("href", "./");
        a.setAttribute("aria-current", "true");
        a.setAttribute(
          "class",
          (a.getAttribute("class") || "") + " is-active".trimStart()
        );
      } else if (lang === "en") {
        a.setAttribute("href", "../");
      } else {
        a.setAttribute("href", `../${lang}/`);
      }
    }
  }
}

async function translateFile(htmlText, lang) {
  const root = parse(htmlText, { comment: true, lowerCaseTagName: false });

  const htmlEl = root.querySelector("html");
  if (htmlEl) htmlEl.setAttribute("lang", lang.htmlLang);

  const textNodes = collectTextNodes(root);
  const attrItems = collectAttrs(root);

  // Strip surrounding whitespace before sending so layout is preserved on the way back.
  const textBodies = textNodes.map((n) => splitWhitespace(n.rawText).body);
  const attrBodies = attrItems.map((a) => splitWhitespace(a.text).body);

  const all = [...textBodies, ...attrBodies];
  console.log(`    → translating ${all.length} strings`);

  const translated = await deeplTranslate(all, lang.code);

  for (let i = 0; i < textNodes.length; i++) {
    const original = textNodes[i].rawText;
    const { lead, trail } = splitWhitespace(original);
    textNodes[i].rawText = `${lead}${translated[i]}${trail}`;
  }

  for (let i = 0; i < attrItems.length; i++) {
    const original = attrItems[i].text;
    const { lead, trail } = splitWhitespace(original);
    attrItems[i].node.setAttribute(
      attrItems[i].attr,
      `${lead}${translated[textNodes.length + i]}${trail}`
    );
  }

  rewritePaths(root, lang.folder);
  rewriteLangSwitchers(root, lang.htmlLang);

  return root.toString();
}

(async () => {
  console.log(
    `\nTranslating ${HTML_FILES.length} HTML files into ${TARGET_LANGS.map(
      (l) => l.code
    ).join(", ")}\n`
  );

  for (const lang of TARGET_LANGS) {
    const outDir = join(__dirname, lang.folder);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    console.log(`Language: ${lang.code} → ${lang.folder}/`);

    for (const file of HTML_FILES) {
      const inputPath = join(__dirname, file);
      const html = readFileSync(inputPath, "utf8");

      console.log(`  ${file}`);
      try {
        const translated = await translateFile(html, lang);
        writeFileSync(join(outDir, file), translated);
      } catch (err) {
        console.error(`    FAILED: ${err.message}`);
      }
    }

    console.log();
  }

  console.log("Done. Translated pages are in nl/ and fr/.");
  console.log(
    "Re-run any time you change English content. DeepL Free covers ~500k chars/month."
  );
})();

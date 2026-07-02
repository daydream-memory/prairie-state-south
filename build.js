// prairie state south — build step. plain node, zero dependencies.
//
//   node build.js
//
// reads:   posts/*.txt   (your entries)
//          images/*      (your photos)
//          template.html (the page shell)
//          style.css
// writes:  _site/        (the finished static site — this is what gets deployed)
//
// entry conventions:
//   * filename is  YYYY-MM-DD-slug.txt   -> the date stamp comes from here
//   * the first non-empty line           -> the entry title
//   * {{some-image.jpg}} anywhere         -> renders images/some-image.jpg there
//   * everything else                     -> your prose, shown exactly as typed

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, "posts");
const IMAGES_DIR = path.join(ROOT, "images");
const OUT_DIR = path.join(ROOT, "_site");
const TEMPLATE = path.join(ROOT, "template.html");

const URL_RE = /(https?:\/\/[^\s<]+)/g;
const IMG_TOKEN = /(\{\{\s*[^}]+?\s*\}\})/g; // matches {{ file.jpg }} and keeps it when splitting

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// turn bare urls into links, on already-escaped text
function linkify(escaped) {
  return escaped.replace(URL_RE, (url) => `<a href="${url}">${url}</a>`);
}

function dateFromFilename(filename) {
  const m = filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : "";
}

// split the body on {{image}} tokens: prose runs become <pre>, tokens become <img>
function renderBody(body) {
  let html = "";
  let buffer = "";

  const flush = () => {
    const trimmed = buffer.replace(/^\n+/, "").replace(/\n+$/, "");
    if (trimmed.trim()) {
      html += `<pre class="text">${linkify(escapeHtml(trimmed))}</pre>`;
    }
    buffer = "";
  };

  for (const part of body.split(IMG_TOKEN)) {
    const m = part.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if (m) {
      flush();
      const src = encodeURI("images/" + m[1]);
      html += `<img class="photo" src="${src}" alt="" loading="lazy">`;
    } else {
      buffer += part;
    }
  }
  flush();
  return html;
}

function renderEntry(filename, raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  const title = (lines[i] || "").trim();
  const body = lines.slice(i + 1).join("\n");

  const id = filename.replace(/\.txt$/i, "");
  const date = dateFromFilename(filename);

  return (
    `<article class="entry" id="${id}">` +
    `<header class="entry-head">` +
    `<a class="date" href="#${id}">${date}</a>` +
    `<h2 class="title">${escapeHtml(title)}</h2>` +
    `</header>` +
    renderBody(body) +
    `</article>`
  );
}

function main() {
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".txt"));

  // newest first, by the date in the filename
  files.sort((a, b) => b.slice(0, 10).localeCompare(a.slice(0, 10)));

  const entries = files
    .map((f) => renderEntry(f, fs.readFileSync(path.join(POSTS_DIR, f), "utf8")))
    .join("\n");

  const template = fs.readFileSync(TEMPLATE, "utf8");
  const html = template.replace("<!--ENTRIES-->", entries);

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), html);
  fs.copyFileSync(path.join(ROOT, "style.css"), path.join(OUT_DIR, "style.css"));
  if (fs.existsSync(IMAGES_DIR)) {
    fs.cpSync(IMAGES_DIR, path.join(OUT_DIR, "images"), { recursive: true });
  }

  console.log(`built ${files.length} entr${files.length === 1 ? "y" : "ies"} -> _site/`);
}

main();

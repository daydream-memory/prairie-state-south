#!/usr/bin/env python3
# prairie state south — build step. plain python 3, no dependencies.
#
#   python3 build.py
#
# reads:   posts/*.txt   (your entries)
#          images/*      (your photos)
#          template.html (the page shell)
#          style.css
# writes:  _site/        (the finished static site — this is what gets deployed)
#
# entry conventions:
#   * filename is  YYYY-MM-DD-slug.txt   -> the date stamp comes from here
#   * the first non-empty line           -> the entry title
#   * {{some-image.jpg}} anywhere         -> renders images/some-image.jpg there
#   * everything else                     -> your prose, shown exactly as typed

import os
import re
import shutil
from urllib.parse import quote

ROOT = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(ROOT, "posts")
IMAGES_DIR = os.path.join(ROOT, "images")
OUT_DIR = os.path.join(ROOT, "_site")
TEMPLATE = os.path.join(ROOT, "template.html")

URL_RE = re.compile(r"(https?://[^\s<]+)")
IMG_SPLIT = re.compile(r"(\{\{\s*[^}]+?\s*\}\})")   # keeps the {{...}} token when splitting
IMG_ONE = re.compile(r"^\{\{\s*([^}]+?)\s*\}\}$")


def escape_html(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def linkify(escaped):
    # turn bare urls into links, on already-escaped text
    return URL_RE.sub(lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>', escaped)


def date_from_filename(filename):
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", filename)
    return f"{m.group(1)}.{m.group(2)}.{m.group(3)}" if m else ""


def render_body(body):
    # split the body on {{image}} tokens: prose runs become <pre>, tokens become <img>
    out = ""
    buffer = ""

    def flush(buf):
        trimmed = re.sub(r"^\n+", "", buf)
        trimmed = re.sub(r"\n+$", "", trimmed)
        if trimmed.strip():
            return f'<p class="text">{linkify(escape_html(trimmed))}</p>'
        return ""

    for part in IMG_SPLIT.split(body):
        m = IMG_ONE.match(part)
        if m:
            out += flush(buffer)
            buffer = ""
            src = quote("images/" + m.group(1))
            out += f'<img class="photo" src="{src}" alt="" loading="lazy">'
        else:
            buffer += part
    out += flush(buffer)
    return out


def render_entry(filename, raw):
    body = raw.replace("\r\n", "\n")

    entry_id = re.sub(r"\.txt$", "", filename, flags=re.IGNORECASE)
    date = date_from_filename(filename)

    return (
        f'<article class="entry" id="{entry_id}">'
        f'<header class="entry-head">'
        f'<a class="date" href="#{entry_id}">{date}</a>'
        f'</header>'
        f'{render_body(body)}'
        f'</article>'
    )


def main():
    files = [f for f in os.listdir(POSTS_DIR) if f.lower().endswith(".txt")]
    # newest first, by the date in the filename
    files.sort(key=lambda f: f[:10], reverse=True)

    entries = "\n".join(
        render_entry(f, open(os.path.join(POSTS_DIR, f), encoding="utf-8").read())
        for f in files
    )

    with open(TEMPLATE, encoding="utf-8") as fh:
        template = fh.read()
    html = template.replace("<!--ENTRIES-->", entries)

    shutil.rmtree(OUT_DIR, ignore_errors=True)
    os.makedirs(OUT_DIR)
    with open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(html)
    shutil.copyfile(os.path.join(ROOT, "style.css"), os.path.join(OUT_DIR, "style.css"))
    if os.path.isdir(IMAGES_DIR):
        shutil.copytree(IMAGES_DIR, os.path.join(OUT_DIR, "images"))

    print(f"built {len(files)} entr{'y' if len(files) == 1 else 'ies'} -> _site/")


if __name__ == "__main__":
    main()

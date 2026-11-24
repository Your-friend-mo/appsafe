import os
import re
import json
from html.parser import HTMLParser

BASE_DIR = r"c:\Users\m\Documents\appsafe"
APP_DIR = os.path.join(BASE_DIR, "app")

with open(os.path.join(BASE_DIR, "products.json"), "r", encoding="utf-8") as f:
    products = json.load(f)

print(f"=== COMPREHENSIVE APPSAFE AUDIT & SEO VERIFICATION START ===\n")

errors = []
successes = []

class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.h1_count = 0
        self.h2_count = 0
        self.h3_count = 0
        self.h4_count = 0
        self.h5_count = 0
        self.h6_count = 0
        self.headings = []
        self.images_total = 0
        self.images_missing_alt = 0
        self.meta_desc = None
        self.meta_title = None
        self.canonical = None
        self.og_title = None
        self.og_desc = None
        self.in_title = False
        self.title_text = ""
        self.has_json_ld = False
        self.json_ld_contents = []
        self.in_script_ld = False
        self.current_ld = ""

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        tag_lower = tag.lower()

        if tag_lower == "title":
            self.in_title = True
        elif tag_lower == "h1":
            self.h1_count += 1
            self.headings.append(1)
        elif tag_lower == "h2":
            self.h2_count += 1
            self.headings.append(2)
        elif tag_lower == "h3":
            self.h3_count += 1
            self.headings.append(3)
        elif tag_lower == "h4":
            self.h4_count += 1
            self.headings.append(4)
        elif tag_lower == "h5":
            self.h5_count += 1
            self.headings.append(5)
        elif tag_lower == "h6":
            self.h6_count += 1
            self.headings.append(6)
        elif tag_lower == "img":
            self.images_total += 1
            alt = attr_dict.get("alt")
            if alt is None or not alt.strip():
                self.images_missing_alt += 1
        elif tag_lower == "meta":
            name = attr_dict.get("name", "").lower()
            prop = attr_dict.get("property", "").lower()
            content = attr_dict.get("content", "")
            if name == "description":
                self.meta_desc = content
            elif prop == "og:title":
                self.og_title = content
            elif prop == "og:description":
                self.og_desc = content
        elif tag_lower == "link":
            rel = attr_dict.get("rel", "").lower()
            if rel == "canonical":
                self.canonical = attr_dict.get("href")
        elif tag_lower == "script":
            stype = attr_dict.get("type", "").lower()
            if stype == "application/ld+json":
                self.has_json_ld = True
                self.in_script_ld = True
                self.current_ld = ""

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower == "title":
            self.in_title = False
        elif tag_lower == "script" and self.in_script_ld:
            self.in_script_ld = False
            self.json_ld_contents.append(self.current_ld)

    def handle_data(self, data):
        if self.in_title:
            self.title_text += data
        if self.in_script_ld:
            self.current_ld += data

def audit_file(fpath, label, expected_keyword=None):
    if not os.path.exists(fpath):
        errors.append(f"{label}: File not found ({fpath})")
        return

    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    parser = AuditParser()
    parser.feed(content)

    # 1. Keyword count (exact 30 if expected)
    if expected_keyword:
        kw_count = len(re.findall(re.escape(expected_keyword), content, re.IGNORECASE))
        if kw_count == 30:
            successes.append(f"{label}: '{expected_keyword}' count == 30")
        else:
            errors.append(f"{label}: '{expected_keyword}' count expected 30, got {kw_count}")

    # 2. H1 Check (exactly 1)
    if parser.h1_count == 1:
        successes.append(f"{label}: H1 tag == 1")
    else:
        errors.append(f"{label}: H1 tag count expected 1, got {parser.h1_count}")

    # 3. H2 Check (exactly 2)
    if parser.h2_count == 2:
        successes.append(f"{label}: H2 tag == 2")
    else:
        errors.append(f"{label}: H2 tag count expected 2, got {parser.h2_count}")

    # 4. H3 Check (> 1)
    if parser.h3_count >= 2:
        successes.append(f"{label}: H3 tag >= 2 (found {parser.h3_count})")
    else:
        errors.append(f"{label}: H3 tag count expected >= 2, got {parser.h3_count}")

    # 5. Heading hierarchy jump check (no H2 -> H4 jumps)
    jumps = 0
    for i in range(len(parser.headings) - 1):
        if parser.headings[i+1] > parser.headings[i] + 1:
            jumps += 1
    if jumps == 0:
        successes.append(f"{label}: Heading hierarchy sequential (0 jumps)")
    else:
        errors.append(f"{label}: Heading hierarchy has {jumps} jumps: {parser.headings}")

    # 6. Image Alt Text Check (0 missing alt text)
    if parser.images_missing_alt == 0:
        successes.append(f"{label}: Image Alt text complete ({parser.images_total} images, 0 missing)")
    else:
        errors.append(f"{label}: Image Alt text missing for {parser.images_missing_alt}/{parser.images_total} images")

    # 7. Meta Description length check (140-160 characters)
    if parser.meta_desc is not None:
        dlen = len(parser.meta_desc)
        if 140 <= dlen <= 160:
            successes.append(f"{label}: Meta Description length is {dlen} chars (within 140-160)")
        else:
            errors.append(f"{label}: Meta Description length expected 140-160, got {dlen} (content: '{parser.meta_desc}')")
    else:
        errors.append(f"{label}: Meta Description missing")

    # 8. Canonical URL check
    if parser.canonical:
        successes.append(f"{label}: Canonical URL set ({parser.canonical})")
    else:
        errors.append(f"{label}: Canonical URL missing")

    # 9. Social Media Tags (OG Title & Desc)
    if parser.og_title and parser.og_desc:
        successes.append(f"{label}: Social Open Graph tags present")
    else:
        errors.append(f"{label}: Missing og:title or og:description")

    # 10. Schema.org JSON-LD
    if parser.has_json_ld:
        # Check for sameAs, FAQPage, HowTo or Product
        combined_ld = " ".join(parser.json_ld_contents)
        if "sameAs" in combined_ld and ("FAQPage" in combined_ld or "SoftwareApplication" in combined_ld or "Organization" in combined_ld):
            successes.append(f"{label}: Rich JSON-LD Schema with sameAs and structured entities")
        else:
            errors.append(f"{label}: JSON-LD missing required sameAs or entity types")
    else:
        errors.append(f"{label}: JSON-LD missing")

# --- Audit Homepage ---
print("--- Auditing index.html ---")
audit_file(os.path.join(BASE_DIR, "index.html"), "index.html", "appsafe")

# --- Audit Keyword Pages ---
print("\n--- Auditing 13 Keyword Pages ---")
keyword_configs = [
    ("appsafe-club.html", "appsafe club"),
    ("appsafe-dot-club.html", "appsafe.club"),
    ("appsafe-club-download.html", "appsafe club download"),
    ("appsafe-club-play-store.html", "appsafe club play store"),
    ("appsafe-dot-clud.html", "appsafe.clud"),
    ("appsafe-club-android-apk.html", "appsafe club android apk"),
    ("appsafe-dot-club-safe.html", "appsafe.club safe"),
    ("appsafe-dot-com.html", "appsafe.com"),
    ("appsafe-apk.html", "appsafe apk"),
    ("appsafe-club-apk.html", "appsafe club apk"),
    ("appsafe-club-apk-mod.html", "appsafe club apk mod"),
    ("appsafe-club-mod-apk.html", "appsafe club mod apk"),
    ("appsafe-club-tiktok.html", "appsafe club tiktok"),
]

for fn, kw in keyword_configs:
    audit_file(os.path.join(BASE_DIR, fn), fn, kw)

# --- Audit Product Pages ---
print("\n--- Auditing 49 Product Pages ---")
for p in products:
    slug = p["slug"]
    title = p["title"]
    audit_file(os.path.join(APP_DIR, f"{slug}.html"), f"app/{slug}.html", title)

# --- Audit Trust & E-E-A-T Pages ---
print("\n--- Auditing Trust Pages ---")
trust_pages = ["about.html", "contact.html", "privacy.html", "terms.html"]
for tp in trust_pages:
    audit_file(os.path.join(BASE_DIR, tp), tp, None)

# --- Audit Locker & APK ---
print("\n--- Auditing Content Locker & Assets ---")
locker_js = os.path.join(BASE_DIR, "js", "locker.js")
locker_css = os.path.join(BASE_DIR, "css", "locker.css")
apk_file = os.path.join(BASE_DIR, "downloads", "appsafe.apk")

if os.path.exists(locker_js):
    with open(locker_js, "r", encoding="utf-8") as f:
        lj = f.read()
    if "831501" in lj and "8902c82579eec05db438" in lj and "4a1d7b7a9f26dbe08fc3a0b059296411" in lj:
        successes.append("js/locker.js verified with user ID & API keys")
    else:
        errors.append("js/locker.js missing required keys")
else:
    errors.append("js/locker.js missing")

if os.path.exists(locker_css):
    successes.append("css/locker.css exists")
else:
    errors.append("css/locker.css missing")

if os.path.exists(apk_file):
    successes.append(f"downloads/appsafe.apk exists ({os.path.getsize(apk_file)} bytes)")
else:
    errors.append("downloads/appsafe.apk missing")

# --- Audit Sitemap, Robots, LLMS ---
sitemap_file = os.path.join(BASE_DIR, "sitemap.xml")
if os.path.exists(sitemap_file):
    with open(sitemap_file, "r", encoding="utf-8") as f:
        sm = f.read()
    loc_count = len(re.findall(r"<loc>", sm))
    if loc_count == 67:
        successes.append(f"sitemap.xml verified with exactly 67 URLs")
    else:
        errors.append(f"sitemap.xml expected 67 URLs, found {loc_count}")
else:
    errors.append("sitemap.xml missing")

robots_file = os.path.join(BASE_DIR, "robots.txt")
if os.path.exists(robots_file):
    with open(robots_file, "r", encoding="utf-8") as f:
        rf = f.read()
    if "GPTBot" in rf and "Google-Extended" in rf and "Sitemap:" in rf:
        successes.append("robots.txt verified with AI crawlers and Sitemap directive")
    else:
        errors.append("robots.txt missing AI crawlers or Sitemap directive")
else:
    errors.append("robots.txt missing")

llms_file = os.path.join(BASE_DIR, "llms.txt")
if os.path.exists(llms_file):
    successes.append("llms.txt verified")
else:
    errors.append("llms.txt missing")

print("\n=======================================================")
print(f"VERIFICATION RESULTS: {len(successes)} checks PASSED, {len(errors)} checks FAILED.")
print("=======================================================")
if errors:
    print(f"\nFAILED CHECKS ({len(errors)}):")
    for e in errors:
        print("  [FAIL] " + e)
else:
    print(f"\nCONGRATULATIONS! ALL {len(successes)} AUDIT AND SEO CHECKS PASSED PERFECTLY!")

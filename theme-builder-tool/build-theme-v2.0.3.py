import argparse
import colorsys
import io
import json
import math
import re
import urllib.request
import zipfile
from pathlib import Path
from wonderwords import RandomWord

rw = RandomWord()

# --- Color Processing & Contrast Helpers ---

def hex_to_rgb(hex_str: str) -> tuple[float, float, float]:
    """Converts a hex color string to normalized RGB values (0.0 to 1.0)."""
    hex_str = hex_str.lstrip('#')[:6]
    if len(hex_str) < 6:
        hex_str = hex_str.ljust(6, '0')
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def rgb_to_hex(rgb: tuple[float, float, float]) -> str:
    """Converts normalized RGB values back to a hex string."""
    return '#{:02x}{:02x}{:02x}'.format(
        int(round(rgb[0] * 255)),
        int(round(rgb[1] * 255)),
        int(round(rgb[2] * 255))
    )

def get_luminance(hex_str: str) -> float:
    """Calculates relative luminance according to WCAG specifications."""
    r, g, b = hex_to_rgb(hex_str)
    def adjust(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b)

def get_contrast_ratio(hex1: str, hex2: str) -> float:
    """Calculates WCAG contrast ratio between two hex colors."""
    l1, l2 = get_luminance(hex1), get_luminance(hex2)
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)

def adjust_hsl(hex_str: str, max_sat: float = None, target_lightness: float = None) -> str:
    """Adjusts saturation and lightness of a hex color in HSL space."""
    r, g, b = hex_to_rgb(hex_str)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if max_sat is not None:
        s = min(s, max_sat)
    if target_lightness is not None:
        l = target_lightness
    r_new, g_new, b_new = colorsys.hls_to_rgb(h, l, s)
    return rgb_to_hex((r_new, g_new, b_new))

def ensure_contrast(fg_hex: str, bg_hex: str, target_ratio: float = 3.0) -> str:
    """Iteratively nudges foreground color lightness until it satisfies the target contrast ratio."""
    if get_contrast_ratio(fg_hex, bg_hex) >= target_ratio:
        return fg_hex

    r, g, b = hex_to_rgb(fg_hex)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    bg_is_light = get_luminance(bg_hex) > 0.45

    step = -0.02 if bg_is_light else 0.02

    for _ in range(40):
        l = max(0.0, min(1.0, l + step))
        r_new, g_new, b_new = colorsys.hls_to_rgb(h, l, s)
        candidate = rgb_to_hex((r_new, g_new, b_new))
        if get_contrast_ratio(candidate, bg_hex) >= target_ratio:
            return candidate

    return fg_hex

# --- Similarity & Vector Comparison Engine ---

def extract_color_vector(theme: dict) -> list[float]:
    """Extracts normalized RGB components for core palette identities into a single vector."""
    keys = [
        ("colors", "background"),
        ("colors", "surface"),
        ("colors", "accent"),
        ("colors", "textPrimary"),
        ("colors", "statusNominal"),
        ("charts", "tempLine"),
    ]
    vector = []
    for category, key in keys:
        hex_val = theme[category][key]
        vector.extend(hex_to_rgb(hex_val))
    return vector

def calculate_similarity_score(vec1: list[float], vec2: list[float]) -> float:
    """Calculates a normalized similarity percentage (0.0 to 1.0) using Euclidean distance."""
    squared_diff_sum = sum((a - b) ** 2 for a, b in zip(vec1, vec2))
    distance = math.sqrt(squared_diff_sum)
    max_distance = math.sqrt(len(vec1))  # Theoretical max distance in N-dimensional unit hypercube
    return 1.0 - (distance / max_distance)

def check_theme_redundancy(candidate_theme: dict, accepted_vectors: list, threshold: float = 0.70) -> tuple[bool, float]:
    """Compares candidate theme against all accepted themes. Returns (is_too_similar, highest_score)."""
    cand_vec = extract_color_vector(candidate_theme)
    max_similarity = 0.0

    for accepted_vec in accepted_vectors:
        similarity = calculate_similarity_score(cand_vec, accepted_vec)
        if similarity > max_similarity:
            max_similarity = similarity
        if similarity >= threshold:
            return True, similarity

    return False, max_similarity

# --- Validation Engine ---

def validate_theme_contrast(theme: dict) -> tuple[bool, str]:
    colors = theme["colors"]
    charts = theme["charts"]
    surface = colors["surface"]

    required_contrasts = [
        ("textPrimary", colors["textPrimary"], 4.5),
        ("textSecondary", colors["textSecondary"], 3.5),
        ("textMuted", colors["textMuted"], 3.0),
        ("accent", colors["accent"], 3.0),
        ("statusNominal", colors["statusNominal"], 3.0),
        ("statusWarning", colors["statusWarning"], 3.0),
        ("statusCritical", colors["statusCritical"], 3.0),
        ("statusInfo", colors["statusInfo"], 3.0),
        ("rhLine", charts["rhLine"], 3.0),
        ("tempLine", charts["tempLine"], 3.0),
    ]

    for label, fg_color, min_ratio in required_contrasts:
        ratio = get_contrast_ratio(fg_color, surface)
        if ratio < min_ratio:
            return False, f"{label} ({fg_color}) failed contrast on {surface} ({ratio:.2f}:1 < {min_ratio}:1)"

    return True, "Passed"

# --- JSON & Utility Helpers ---

def clean_jsonc(json_str: str) -> str:
    pattern = r'("(?:\\.|[^"\\])*")|//.*$|/\*[\s\S]*?\*/'
    def replace(m):
        return m.group(1) if m.group(1) is not None else ""
    cleaned = re.sub(pattern, replace, json_str, flags=re.MULTILINE)
    return re.sub(r',(?=\s*[\}\]])', '', cleaned)

def parse_loose_json(raw_str: str) -> dict:
    return json.loads(clean_jsonc(raw_str), strict=False)

def to_camel_case_var(slug: str) -> str:
    words = [w for w in slug.split('-') if w]
    if not words:
        return "customTheme"
    return words[0].lower() + "".join(w.title() for w in words[1:]) + "Theme"

def generate_procedural_name(seen_slugs: set) -> tuple[str, str, str]:
    for _ in range(1000):
        adj = rw.word(include_parts_of_speech=["adjectives"])
        noun = rw.word(include_parts_of_speech=["nouns"])
        raw_slug = f"{adj.lower()}-{noun.lower()}"
        slug = re.sub(r'[^a-z0-9]+', '-', raw_slug).strip('-')

        if slug not in seen_slugs:
            seen_slugs.add(slug)
            display_name = f"{adj.title()} {noun.title()}"
            var_name = to_camel_case_var(slug)
            return display_name, slug, var_name

    counter = 1
    while f"custom-preset-{counter}" in seen_slugs:
        counter += 1
    slug = f"custom-preset-{counter}"
    seen_slugs.add(slug)
    return f"Custom Preset {counter}", slug, to_camel_case_var(slug)

def find_scope_color(token_colors: list, scope_query: str, fallback: str) -> str:
    for rule in token_colors:
        scopes = rule.get("scope", [])
        if isinstance(scopes, str):
            scopes = [s.strip() for s in scopes.split(",")]
        if any(scope_query in s for s in scopes):
            settings = rule.get("settings", {})
            if "foreground" in settings:
                return settings["foreground"]
    return fallback

# --- Theme Harmonization ---

def convert_to_humid1_data(vscode_data: dict, author: str, version: str, slug: str, display_name: str) -> dict:
    colors = vscode_data.get("colors", vscode_data.get("workbench_colors", {}))
    tokens = vscode_data.get("tokenColors", vscode_data.get("token_colors", []))

    keyword_color = find_scope_color(tokens, "keyword", "#38bdf8")
    comment_color = find_scope_color(tokens, "comment", "#10b981")
    invalid_color = find_scope_color(tokens, "invalid", "#f43f5e")

    raw_bg = colors.get("editor.background", "#050505")
    raw_fg = colors.get("editor.foreground", "#f8fafc")
    raw_accent = colors.get("activityBarBadge.background", colors.get("button.background", keyword_color))

    is_light = get_luminance(raw_bg) > 0.45

    if is_light:
        bg = adjust_hsl(raw_bg, target_lightness=0.96)
        surface = "#ffffff"
        elevated = "#f8fafc"
        border = adjust_hsl(raw_bg, target_lightness=0.85)
        border_active = adjust_hsl(raw_accent, max_sat=0.50, target_lightness=0.50)
        
        primary_candidate = "#0f172a"
        secondary_candidate = "#334155"
        muted_candidate = "#64748b"
    else:
        bg = raw_bg
        surface = adjust_hsl(raw_bg, target_lightness=0.07)
        elevated = adjust_hsl(raw_bg, target_lightness=0.12)
        border = adjust_hsl(raw_bg, target_lightness=0.18)
        border_active = colors.get("editorIndentGuide.activeBackground", colors.get("focusBorder", "#334155"))
        
        primary_candidate = raw_fg
        secondary_candidate = colors.get("sideBarTitle.foreground", colors.get("descriptionForeground", "#94a3b8"))
        muted_candidate = colors.get("input.placeholderForeground", "#64748b")

    text_primary = ensure_contrast(primary_candidate, surface, target_ratio=4.5)
    text_secondary = ensure_contrast(secondary_candidate, surface, target_ratio=3.5)
    text_muted = ensure_contrast(muted_candidate, surface, target_ratio=3.0)

    raw_accent_sat = adjust_hsl(raw_accent, max_sat=0.65)
    accent = ensure_contrast(raw_accent_sat, surface, target_ratio=3.0)
    accent_hover = adjust_hsl(accent, max_sat=0.75, target_lightness=0.45 if is_light else 0.55)
    accent_text = "#ffffff" if is_light else "#050505"

    status_nominal = ensure_contrast(colors.get("testing.iconPassed", comment_color), surface, target_ratio=3.0)
    status_warning = ensure_contrast(colors.get("editorWarning.foreground", "#d97706"), surface, target_ratio=3.0)
    status_critical = ensure_contrast(colors.get("editorError.foreground", invalid_color), surface, target_ratio=3.0)
    status_info = ensure_contrast(colors.get("editorInfo.foreground", keyword_color), surface, target_ratio=3.0)

    temp_line_raw = adjust_hsl(keyword_color, max_sat=0.60, target_lightness=0.45 if is_light else 0.60)
    temp_line = ensure_contrast(temp_line_raw, surface, target_ratio=3.0)

    return {
        "id": slug,
        "name": display_name,
        "author": author,
        "version": version,
        "description": f"Imported palette preset ({display_name}).",
        "colors": {
            "background": bg,
            "surface": surface,
            "surfaceElevated": elevated,
            "surfaceSubtle": bg,
            "border": border,
            "borderHighlight": border_active,
            "textPrimary": text_primary,
            "textSecondary": text_secondary,
            "textMuted": text_muted,
            "accent": accent,
            "accentHover": accent_hover,
            "accentText": accent_text,
            "statusNominal": status_nominal,
            "statusWarning": status_warning,
            "statusCritical": status_critical,
            "statusInfo": status_info
        },
        "charts": {
            "gridColor": border,
            "rhLine": accent,
            "rhGradientStart": accent,
            "tempLine": temp_line,
            "tooltipBackground": elevated,
            "tooltipBorder": border_active
        },
        "styles": {
            "borderRadius": "12px",
            "cardRadius": "12px",
            "buttonRadius": "8px",
            "fontFamily": "Inter, ui-sans-serif, system-ui",
            "monoFamily": "'JetBrains Mono', monospace",
            "backdropBlur": "8px",
            "borderWidth": "1px",
            "density": "comfortable"
        }
    }

# --- Export & Process Operations ---

def format_ts_preset(var_name: str, theme_dict: dict) -> str:
    return (
        "import { Theme } from '../types';\n\n"
        f"export const {var_name}: Theme = {json.dumps(theme_dict, indent=2)};\n"
    )

def write_index_ts(output_dir: Path, theme_registry: list):
    imports = [f"import {{ {i['var_name']} }} from './presets/{i['slug']}';" for i in theme_registry]
    preset_vars = [f"  {i['var_name']}" for i in theme_registry]
    default_var = theme_registry[0]["var_name"] if theme_registry else "null"

    content = (
        "import { Theme } from './types';\n"
        + "\n".join(imports) + "\n\n"
        "export * from './types';\n\n"
        "export const THEME_PRESETS: Theme[] = [\n"
        + ",\n".join(preset_vars) + "\n"
        "];\n\n"
        "export const getThemeById = (id: string): Theme => {\n"
        f"  return THEME_PRESETS.find(t => t.id === id) || {default_var};\n"
        "};\n"
    )

    with open(output_dir / "index.ts", "w", encoding="utf-8") as f:
        f.write(content)

def fetch_top_extensions(target_count: int) -> list:
    extensions, offset, page_size = [], 0, 50
    while len(extensions) < target_count * 25:  # Over-fetch candidate extensions to allow room for drops
        url = f"https://open-vsx.org/api/-/search?category=Themes&sortBy=downloadCount&sortOrder=desc&size={page_size}&offset={offset}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req) as resp:
                results = json.loads(resp.read().decode("utf-8"), strict=False).get("extensions", [])
                if not results:
                    break
                extensions.extend(results)
                offset += page_size
        except Exception:
            break
    return extensions

def process_vsix(download_url: str):
    req = urllib.request.Request(download_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        zip_bytes = io.BytesIO(resp.read())

    with zipfile.ZipFile(zip_bytes) as z:
        if "extension/package.json" not in z.namelist():
            return
        pkg_json = parse_loose_json(z.read("extension/package.json").decode("utf-8", errors="ignore"))
        for t_meta in pkg_json.get("contributes", {}).get("themes", []):
            path = f"extension/{t_meta.get('path', '').lstrip('./')}"
            if path in z.namelist():
                yield parse_loose_json(z.read(path).decode("utf-8", errors="ignore"))

def build_themes(target_count: int, output_dir: Path, similarity_threshold: float = 0.70):
    presets_dir = output_dir / "presets"
    presets_dir.mkdir(parents=True, exist_ok=True)
    
    extensions = fetch_top_extensions(target_count)
    successful_count, theme_registry, seen_slugs = 0, [], set()
    accepted_vectors = []

    for ext in extensions:
        if successful_count >= target_count:
            break

        download_url = ext.get("files", {}).get("download") or f"https://open-vsx.org/api/{ext.get('namespace')}/{ext.get('name')}/{ext.get('version')}/file/{ext.get('namespace')}.{ext.get('name')}-{ext.get('version')}.vsix"

        try:
            for raw_theme_json in process_vsix(download_url):
                if successful_count >= target_count:
                    break

                display_name, slug, var_name = generate_procedural_name(seen_slugs)
                humid1_theme = convert_to_humid1_data(raw_theme_json, ext.get("namespace"), ext.get("version", "1.0.0"), slug, display_name)

                # 1. Check WCAG Contrast Compliance
                passed_contrast, reason = validate_theme_contrast(humid1_theme)
                if not passed_contrast:
                    print(f"  ✕ Rejected {var_name} (Contrast Failure: {reason})")
                    continue

                # 2. Check Theme Similarity Threshold
                is_redundant, max_score = check_theme_redundancy(humid1_theme, accepted_vectors, threshold=similarity_threshold)
                if is_redundant:
                    print(f"  ✕ Dropped {var_name} ({max_score*100:.1f}% similar to an existing theme >= {similarity_threshold*100:.0f}%)")
                    continue

                # Store theme and cache its vector
                accepted_vectors.append(extract_color_vector(humid1_theme))

                with open(presets_dir / f"{slug}.ts", "w", encoding="utf-8") as f:
                    f.write(format_ts_preset(var_name, humid1_theme))

                theme_registry.append({"slug": slug, "var_name": var_name})
                successful_count += 1
                print(f"  ✓ [{successful_count}/{target_count}] Accepted: {var_name} ({display_name}) [Max similarity: {max_score*100:.1f}%]")

        except Exception as e:
            print(f"  ✕ Skipped {ext.get('name')}: {e}")

    if theme_registry:
        write_index_ts(output_dir, theme_registry)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-c", "--count", type=int, default=20)
    parser.add_argument("-o", "--output", type=str, default="./src/themes")
    parser.add_argument("-s", "--similarity", type=float, default=0.70, help="Max allowed similarity score (0.0 to 1.0)")
    args = parser.parse_args()
    build_themes(target_count=args.count, output_dir=Path(args.output), similarity_threshold=args.similarity)
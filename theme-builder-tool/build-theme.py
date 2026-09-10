import argparse
import io
import json
import os
import re
import urllib.request
import zipfile
from pathlib import Path

def clean_jsonc(json_str: str) -> str:
    """Safely removes single/multi-line comments and trailing commas without touching string contents."""
    pattern = r'("(?:\\.|[^"\\])*")|//.*$|/\*[\s\S]*?\*/'
    def replace(m):
        return m.group(1) if m.group(1) is not None else ""
    
    cleaned = re.sub(pattern, replace, json_str, flags=re.MULTILINE)
    cleaned = re.sub(r',(?=\s*[\}\]])', '', cleaned)
    return cleaned

def parse_loose_json(raw_str: str) -> dict:
    """Cleans JSONC and parses with loose control character checking."""
    cleaned = clean_jsonc(raw_str)
    return json.loads(cleaned, strict=False)

def clean_theme_name(label: str, namespace: str) -> str:
    """Transforms raw VS Code extension titles into clean UI names."""
    name = label
    noise = [
        r'\(built-in\)', r'for VSCode', r'VS Code', r'VSCode', 
        r'Official', r'Theme', r'Themes', r'Extension', r'Remastered'
    ]
    for pattern in noise:
        name = re.sub(pattern, '', name, flags=re.IGNORECASE)

    name = re.sub(r'[\(\)\[\]\-_+]', ' ', name)
    name = ' '.join(name.split()).title()

    if not name or len(name) < 3:
        name = f"{namespace.title()} Dark"

    return name

def slugify(text: str) -> str:
    """Generates clean file names and IDs."""
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')

def to_camel_case_var(slug: str) -> str:
    """Converts a slug string into a valid camelCase TypeScript variable name ending in 'Theme'."""
    words = slug.split('-')
    if not words:
        return "customTheme"
    camel = words[0].lower() + "".join(w.title() for w in words[1:])
    return f"{camel}Theme"

def find_scope_color(token_colors: list, scope_query: str, fallback: str) -> str:
    """Queries TextMate scope rules for syntax highlight colors."""
    for rule in token_colors:
        scopes = rule.get("scope", [])
        if isinstance(scopes, str):
            scopes = [s.strip() for s in scopes.split(",")]
        if any(scope_query in s for s in scopes):
            settings = rule.get("settings", {})
            if "foreground" in settings:
                return settings["foreground"]
    return fallback

def convert_to_humid1_data(vscode_data: dict, meta: dict) -> dict:
    """Maps VS Code workbench colors and syntax tokens to Humid1 Theme data shape."""
    colors = vscode_data.get("colors", vscode_data.get("workbench_colors", {}))
    tokens = vscode_data.get("tokenColors", vscode_data.get("token_colors", []))

    keyword_color = find_scope_color(tokens, "keyword", "#38bdf8")
    comment_color = find_scope_color(tokens, "comment", "#10b981")
    invalid_color = find_scope_color(tokens, "invalid", "#f43f5e")

    bg = colors.get("editor.background", "#050505")
    surface = colors.get("sideBar.background", colors.get("menu.background", "#0d0d0d"))
    elevated = colors.get("menu.background", colors.get("editorWidget.background", "#181818"))
    border = colors.get("sideBarSectionHeader.border", colors.get("editorIndentGuide.background", "#1f1f1f"))
    border_active = colors.get("editorIndentGuide.activeBackground", colors.get("focusBorder", "#334155"))
    accent = colors.get("activityBarBadge.background", colors.get("button.background", keyword_color))

    display_name = clean_theme_name(meta["name"], meta["author"])
    theme_id = slugify(f"{meta['author']}-{display_name}")

    return {
        "id": theme_id,
        "name": display_name,
        "author": meta["author"],
        "version": meta.get("version", "1.0.0"),
        "description": f"Custom humidor monitoring palette ({display_name}).",
        "colors": {
            "background": bg,
            "surface": surface,
            "surfaceElevated": elevated,
            "surfaceSubtle": bg,
            "border": border,
            "borderHighlight": border_active,
            "textPrimary": colors.get("editor.foreground", "#fcfaf2"),
            "textSecondary": colors.get("sideBarTitle.foreground", colors.get("descriptionForeground", "#a1a1aa")),
            "textMuted": colors.get("input.placeholderForeground", "#52525b"),
            "accent": accent,
            "accentHover": colors.get("button.hoverBackground", colors.get("statusBarItem.remoteBackground", accent)),
            "accentText": colors.get("activityBarBadge.foreground", "#050505"),
            "statusNominal": colors.get("testing.iconPassed", comment_color),
            "statusWarning": colors.get("editorWarning.foreground", "#e5c158"),
            "statusCritical": colors.get("editorError.foreground", invalid_color),
            "statusInfo": colors.get("editorInfo.foreground", keyword_color)
        },
        "charts": {
            "gridColor": border,
            "rhLine": accent,
            "rhGradientStart": accent,
            "tempLine": colors.get("statusBarItem.remoteBackground", keyword_color),
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

def format_ts_preset(var_name: str, theme_dict: dict) -> str:
    """Formats theme dictionary into a clean TypeScript file string."""
    json_body = json.dumps(theme_dict, indent=2)
    return (
        "import { Theme } from '../types';\n\n"
        f"export const {var_name}: Theme = {json_body};\n"
    )

def write_index_ts(output_dir: Path, theme_registry: list):
    """Generates index.ts exporting all themes and lookup utility."""
    imports = []
    preset_vars = []

    for item in theme_registry:
        imports.append(f"import {{ {item['var_name']} }} from './presets/{item['slug']}';")
        preset_vars.append(f"  {item['var_name']}")

    default_var = theme_registry[0]["var_name"] if theme_registry else "null"

    index_content = (
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
        f.write(index_content)

def fetch_top_extensions(target_count: int) -> list:
    """Scrapes Open VSX using pagination to gather extension packages."""
    extensions = []
    offset = 0
    page_size = 50
    oversample_target = target_count * 3

    while len(extensions) < oversample_target:
        url = f"https://open-vsx.org/api/-/search?category=Themes&sortBy=downloadCount&sortOrder=desc&size={page_size}&offset={offset}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"), strict=False)
                results = data.get("extensions", [])
                if not results:
                    break
                extensions.extend(results)
                offset += page_size
        except Exception as e:
            print(f"Warning: Failed fetching extension list at offset {offset}: {e}")
            break

    return extensions

def process_vsix(download_url: str):
    """Downloads VSIX package into memory and extracts theme JSON objects."""
    req = urllib.request.Request(download_url, headers={"User-Agent": "Mozilla/5.0"})
    
    with urllib.request.urlopen(req) as resp:
        zip_bytes = io.BytesIO(resp.read())

    with zipfile.ZipFile(zip_bytes) as z:
        pkg_manifest_path = "extension/package.json"
        if pkg_manifest_path not in z.namelist():
            return
        
        pkg_json = parse_loose_json(z.read(pkg_manifest_path).decode("utf-8", errors="ignore"))
        contributes = pkg_json.get("contributes", {})
        themes_meta = contributes.get("themes", [])

        for t_meta in themes_meta:
            path = t_meta.get("path", "").lstrip("./")
            full_zip_path = f"extension/{path}"
            
            if full_zip_path in z.namelist():
                theme_content = z.read(full_zip_path).decode("utf-8", errors="ignore")
                theme_data = parse_loose_json(theme_content)
                label = t_meta.get("label", pkg_json.get("displayName", "Unnamed Theme"))
                yield label, theme_data

def build_themes(target_count: int, output_dir: Path):
    presets_dir = output_dir / "presets"
    presets_dir.mkdir(parents=True, exist_ok=True)

    print(f"Targeting top {target_count} themes from Open VSX...")
    
    extensions = fetch_top_extensions(target_count)
    successful_count = 0
    theme_registry = []

    for ext in extensions:
        if successful_count >= target_count:
            break

        ext_name = ext.get("displayName") or ext.get("name")
        namespace = ext.get("namespace")
        name = ext.get("name")
        version = ext.get("version", "1.0.0")

        download_url = ext.get("files", {}).get("download")
        if not download_url:
            download_url = f"https://open-vsx.org/api/{namespace}/{name}/{version}/file/{namespace}.{name}-{version}.vsix"

        print(f"\nProcessing extension: {ext_name} by {namespace}...")

        try:
            theme_found = False
            for label, raw_theme_json in process_vsix(download_url):
                if successful_count >= target_count:
                    break

                meta = {
                    "id": label,
                    "name": label,
                    "author": namespace,
                    "version": version
                }

                humid1_theme = convert_to_humid1_data(raw_theme_json, meta)
                slug = humid1_theme["id"]
                var_name = to_camel_case_var(slug)

                ts_code = format_ts_preset(var_name, humid1_theme)
                output_path = presets_dir / f"{slug}.ts"

                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(ts_code)

                theme_registry.append({"slug": slug, "var_name": var_name})
                successful_count += 1
                theme_found = True
                print(f"  ✓ [{successful_count}/{target_count}] Built: {var_name} (presets/{slug}.ts)")

            if not theme_found:
                print(f"  ↷ Skipped {ext_name}: Package contains no workbench color themes.")

        except Exception as e:
            print(f"  ✕ Skipped {ext_name}: {e}")

    # Generate index.ts referencing generated presets
    if theme_registry:
        write_index_ts(output_dir, theme_registry)
        print(f"\nGenerated `index.ts` linking {len(theme_registry)} theme presets.")

    print(f"Completed! Generated {successful_count} TypeScript themes in `{output_dir.resolve()}`")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape VS Code themes and convert them to Humid1 TypeScript presets.")
    parser.add_argument("-c", "--count", type=int, default=20, help="Number of themes to generate (default: 20)")
    parser.add_argument("-o", "--output", type=str, default="./src/themes", help="Output directory path (default: ./src/themes)")

    args = parser.parse_args()
    build_themes(target_count=args.count, output_dir=Path(args.output))
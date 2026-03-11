#!/usr/bin/env node

/**
 * Spec Generation Script
 *
 * Parses tokens.css and theme.css (the source of truth) and generates:
 *   - specs/tokens/token-reference.md  (complete token catalog)
 *   - specs/foundations/color.md
 *   - specs/foundations/spacing.md
 *   - specs/foundations/typography.md
 *   - specs/foundations/radius.md
 *   - specs/foundations/elevation.md
 *   - specs/foundations/motion.md
 *
 * Hand-authored sections are preserved via <!-- GENERATED:START --> / <!-- GENERATED:END -->
 * markers in foundation specs. Sections outside markers are untouched.
 *
 * Usage:
 *   node scripts/generate-specs.js           # generate/update specs
 *   node scripts/generate-specs.js --check   # CI mode: exit 1 if specs are stale
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src", "styles");
const SPECS_DIR = path.join(__dirname, "..", "specs");

// ============================================================================
// CSS Parser — extracts custom property declarations from tokens.css & theme.css
// ============================================================================

/**
 * Parse a CSS file into structured sections of custom property declarations.
 * Returns an array of { selector, comment, props: [{ name, value, inlineComment }] }
 */
function parseCSS(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const blocks = [];
  let currentSelector = null;
  let pendingSelectorParts = []; // accumulate multi-line selectors
  let currentProps = [];
  let currentSectionComment = null;
  let braceDepth = 0;
  let inMultiLineComment = false;
  const selectorStack = []; // track nested selectors (e.g., @media > rule)

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle multi-line comments
    if (inMultiLineComment) {
      if (trimmed.endsWith("*/")) {
        inMultiLineComment = false;
      }
      continue;
    }

    // Track section comments (/* ---- Section Name ---- */)
    const sectionMatch = trimmed.match(
      /^\/\*\s*-{2,}\s*(.+?)\s*-{2,}\s*\*\/$/
    );
    if (sectionMatch) {
      currentSectionComment = sectionMatch[1].trim();
      continue;
    }

    // Track block comments (/* ... */) that span a line — used for subsection headers
    const blockCommentMatch = trimmed.match(/^\/\*\s*(.+?)\s*\*\/$/);
    if (blockCommentMatch && !sectionMatch) {
      // Only treat as section comment if it's not a property inline comment
      if (!trimmed.includes(":")) {
        currentSectionComment = blockCommentMatch[1].trim();
        continue;
      }
    }

    // Multi-line block comment start
    if (trimmed.startsWith("/*") && !trimmed.endsWith("*/")) {
      inMultiLineComment = true;
      continue;
    }

    // Track selector openings — line contains {
    if (trimmed.includes("{") && !trimmed.startsWith("--")) {
      const selectorPart = trimmed.replace(/\s*\{.*$/, "").trim();
      if (selectorPart) pendingSelectorParts.push(selectorPart);
      const newSelector = pendingSelectorParts.join(" ").trim();
      pendingSelectorParts = [];

      // Push parent selector onto stack for nesting (e.g., @media)
      if (braceDepth > 0 && currentSelector) {
        selectorStack.push(currentSelector);
      }

      // Build full selector with parent context
      const parentContext = selectorStack.length > 0 ? selectorStack[selectorStack.length - 1] + " >> " : "";
      currentSelector = parentContext + newSelector;

      braceDepth++;
      continue;
    }

    // Track closing braces
    if (trimmed === "}") {
      braceDepth--;
      if (currentProps.length > 0) {
        blocks.push({
          selector: currentSelector,
          props: [...currentProps],
        });
        currentProps = [];
      }
      // Pop selector stack when exiting nested block
      if (selectorStack.length > 0 && braceDepth <= selectorStack.length) {
        selectorStack.pop();
      }
      currentSelector = selectorStack.length > 0 ? selectorStack[selectorStack.length - 1] : null;
      continue;
    }

    // Lines that end with comma are partial selectors (e.g., ":root,")
    if (braceDepth === 0 && trimmed.endsWith(",")) {
      pendingSelectorParts.push(trimmed);
      continue;
    }
    // Also handle partial selectors inside @media blocks
    if (braceDepth > 0 && trimmed.endsWith(",") && !trimmed.startsWith("--")) {
      pendingSelectorParts.push(trimmed);
      continue;
    }

    // Parse custom property declarations
    const propMatch = trimmed.match(
      /^(--[\w-]+)\s*:\s*(.+?)\s*;?\s*(?:\/\*\s*(.+?)\s*\*\/)?$/
    );
    if (propMatch) {
      let value = propMatch[2].replace(/;$/, "").trim();
      currentProps.push({
        name: propMatch[1],
        value,
        inlineComment: propMatch[3] || null,
        section: currentSectionComment,
      });
    }
  }

  // Catch any remaining props
  if (currentProps.length > 0) {
    blocks.push({
      selector: currentSelector,
      props: [...currentProps],
    });
  }

  return blocks;
}

/**
 * Parse tokens.css and theme.css into a unified token map.
 */
function parseTokens() {
  const tokensBlocks = parseCSS(path.join(SRC_DIR, "tokens.css"));
  const themeBlocks = parseCSS(path.join(SRC_DIR, "theme.css"));

  // Flatten all :root tokens from tokens.css
  const primitives = [];
  const semanticNonThemed = [];

  let inLayer2 = false;
  for (const block of tokensBlocks) {
    // Skip @media override blocks (e.g., mobile overrides) — those are responsive adjustments
    if (block.selector && block.selector.includes("@media")) continue;

    for (const prop of block.props) {
      // Detect Layer 2 boundary by section comment
      if (
        prop.section &&
        (prop.section.includes("LAYER 2") || prop.section.includes("Opacity"))
      ) {
        inLayer2 = true;
      }
      if (
        prop.section &&
        prop.section.includes("LAYER 1")
      ) {
        inLayer2 = false;
      }

      if (inLayer2) {
        semanticNonThemed.push(prop);
      } else {
        primitives.push(prop);
      }
    }
  }

  // Parse themed tokens from theme.css
  const darkTokens = new Map();
  const lightTokens = new Map();
  const monoTokens = { dark: new Map(), light: new Map() };

  for (const block of themeBlocks) {
    const sel = block.selector || "";

    // Helper: extract the innermost selector (after >>)
    const innerSel = sel.includes(" >> ") ? sel.split(" >> ").pop() : sel;
    // Helper: check if wrapped in @media (prefers-color-scheme: light)
    const inLightMedia = sel.includes("prefers-color-scheme: light");
    // Helper: check for positive (non-:not) attribute selector matches
    // Strips :not(...) wrappers before checking for attribute presence
    const selWithoutNot = innerSel.replace(/:not\([^)]*\)/g, "");

    // Mono theme overrides (check these first — they're more specific)
    if (innerSel.includes("data-ui-theme='mono'")) {
      // Mono dark: explicit dark selector (not inside :not), or system dark default
      if (selWithoutNot.includes("[data-theme='dark']")) {
        for (const p of block.props) monoTokens.dark.set(p.name, p.value);
      // Mono dark default: :not(light) in non-light-media context
      } else if (
        !inLightMedia && innerSel.includes(":not([data-theme='light'])")
      ) {
        for (const p of block.props) monoTokens.dark.set(p.name, p.value);
      // Mono light: explicit light selector, or system-preference-light media query
      } else if (
        selWithoutNot.includes("[data-theme='light']") ||
        inLightMedia
      ) {
        for (const p of block.props) monoTokens.light.set(p.name, p.value);
      }
      continue;
    }

    // Dark theme: :root (default), :root + [data-theme='dark'], or explicit dark
    // Use selWithoutNot to avoid matching :not() wrappers
    const isDark =
      innerSel === ":root" ||
      innerSel.includes(":root,") ||
      (selWithoutNot.includes("[data-theme='dark']") && !inLightMedia);
    // Light theme: explicit light or system preference light
    const isLight =
      selWithoutNot.includes("[data-theme='light']") ||
      inLightMedia;

    if (isDark) {
      for (const p of block.props) darkTokens.set(p.name, p);
    }
    if (isLight) {
      for (const p of block.props) {
        if (!lightTokens.has(p.name)) lightTokens.set(p.name, p);
      }
    }
  }

  return { primitives, semanticNonThemed, darkTokens, lightTokens, monoTokens };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Group props by their section comment.
 */
function groupBySection(props) {
  const groups = [];
  let currentSection = null;
  let currentGroup = [];

  for (const prop of props) {
    const section = prop.section || "Ungrouped";
    if (section !== currentSection) {
      if (currentGroup.length > 0) {
        groups.push({ section: currentSection, props: currentGroup });
      }
      currentSection = section;
      currentGroup = [prop];
    } else {
      currentGroup.push(prop);
    }
  }
  if (currentGroup.length > 0) {
    groups.push({ section: currentSection, props: currentGroup });
  }
  return groups;
}

/**
 * Resolve a primitive token value to a hex + px description for display.
 */
function resolveDisplayValue(name, value, inlineComment) {
  // If it references another var, show both
  const varRef = value.match(/var\((--[\w-]+)\)/);
  if (varRef) {
    return value;
  }
  return value;
}

/**
 * For rem values, compute px equivalent.
 */
function remToPx(value) {
  const match = value.match(/^([\d.]+)rem$/);
  if (match) {
    return `${Math.round(parseFloat(match[1]) * 16)}px`;
  }
  return null;
}

function escapeForTable(s) {
  return s.replace(/\|/g, "\\|");
}

// ============================================================================
// Token Reference Generator
// ============================================================================

function generateTokenReference(tokens) {
  const { primitives, semanticNonThemed, darkTokens, lightTokens, monoTokens } = tokens;
  const lines = [];

  lines.push("<!-- This file is auto-generated by scripts/generate-specs.js. Do not edit manually. -->");
  lines.push("");
  lines.push("# Token Reference");
  lines.push("");
  lines.push("## How to Use");
  lines.push("");
  lines.push("Components (Layer 3) reference Layer 2 semantic aliases. Never reference Layer 1 primitives directly in component CSS.");
  lines.push("");
  lines.push("- **Layer 1** — Primitive tokens: raw design values defined in `tokens.css`. Named by scale (e.g., `--color-gray-500`, `--space-4`).");
  lines.push("- **Layer 2** — Semantic aliases: project-level references to Layer 1. Non-themed aliases live in `tokens.css`; themed aliases live in `theme.css`. Named by purpose (e.g., `--text-secondary`, `--surface-primary`).");
  lines.push("- **Layer 3** — Components consume only Layer 2 aliases.");

  // Layer 1 primitives grouped by section
  const primGroups = groupBySection(primitives);
  // Annotations for tokens that don't have inline comments in CSS
  const tokenNotes = {
    "--color-white": "Pure white",
    "--color-black": "Pure black",
    "--color-gray-50": "Lightest gray",
    "--color-gray-500": "Mid gray",
    "--color-gray-850": "Non-standard step",
    "--color-gray-950": "Darkest gray",
    "--radius-full": "Pill/circle",
  };

  const sectionToHeading = {
    "Colors: Neutral": { h2: "Color Primitives (Layer 1)", h3: "Neutrals" },
    "Colors: Accent — Orange": { h3: "Accent — Orange" },
    "Colors: Brand Palette": { h3: "Brand Palette" },
    "Colors: Status": { h3: "Status" },
    "Spacing Scale (4px base)": { h2: "Spacing (Layer 1)", h3: null },
    "Typography Scale": { h2: "Typography (Layer 1)", h3: "Font Sizes" },
    "Border Radius": { h2: "Border Radius (Layer 1)", h3: null },
    "Shadows": { h2: "Shadows (Layer 1)", h3: null },
    "Durations": { h2: "Motion (Layer 1)", h3: "Durations" },
    "Transitions (duration + easing)": { h3: "Transitions" },
    "Easing": { h3: "Easing" },
  };

  for (const group of primGroups) {
    const heading = sectionToHeading[group.section];
    if (!heading) {
      // Handle font weights, line heights, letter spacing as subsections of Typography
      if (group.section && group.props[0]?.name.startsWith("--font-weight")) {
        lines.push("");
        lines.push("### Font Weights");
        lines.push("");
        lines.push("| Token | Value |");
        lines.push("|-------|-------|");
        for (const p of group.props) {
          lines.push(`| \`${p.name}\` | \`${p.value}\` |`);
        }
        continue;
      }
      if (group.props[0]?.name.startsWith("--line-height")) {
        lines.push("");
        lines.push("### Line Heights");
        lines.push("");
        lines.push("| Token | Value |");
        lines.push("|-------|-------|");
        for (const p of group.props) {
          lines.push(`| \`${p.name}\` | \`${p.value}\` |`);
        }
        continue;
      }
      if (group.props[0]?.name.startsWith("--letter-spacing")) {
        lines.push("");
        lines.push("### Letter Spacing");
        lines.push("");
        lines.push("| Token | Value |");
        lines.push("|-------|-------|");
        for (const p of group.props) {
          lines.push(`| \`${p.name}\` | \`${p.value}\` |`);
        }
        continue;
      }
      continue;
    }

    if (heading.h2) {
      lines.push("");
      lines.push("---");
      lines.push("");
      lines.push(`## ${heading.h2}`);
    }
    if (heading.h3) {
      lines.push("");
      lines.push(`### ${heading.h3}`);
    }

    // Determine table columns
    const hasRemValues = group.props.some((p) => remToPx(p.value));
    const hasNotes = group.props.some((p) => p.inlineComment || tokenNotes[p.name]);

    lines.push("");
    if (hasRemValues) {
      lines.push("| Token | Value | px Equivalent |");
      lines.push("|-------|-------|---------------|");
    } else if (hasNotes) {
      lines.push("| Token | Value | Notes |");
      lines.push("|-------|-------|-------|");
    } else {
      lines.push("| Token | Value |");
      lines.push("|-------|-------|");
    }

    for (const p of group.props) {
      const px = remToPx(p.value);
      const note = p.inlineComment || tokenNotes[p.name] || "";
      if (hasRemValues) {
        lines.push(
          `| \`${p.name}\` | \`${escapeForTable(p.value)}\` | ${px || escapeForTable(note)} |`
        );
      } else if (hasNotes) {
        lines.push(
          `| \`${p.name}\` | \`${escapeForTable(p.value)}\` | ${escapeForTable(note)} |`
        );
      } else {
        lines.push(`| \`${p.name}\` | \`${escapeForTable(p.value)}\` |`);
      }
    }
  }

  // Layer 2 themed tokens
  const themedCategories = [
    {
      title: "Semantic: Surfaces (Layer 2, themed)",
      prefix: "--surface-",
      usage: {
        "--surface-background": "Page background",
        "--surface-primary": "Card backgrounds",
        "--surface-secondary": "Nested surfaces",
        "--surface-tertiary": "Tertiary surfaces",
        "--surface-inverse": "Inverted surfaces",
      },
    },
    {
      title: "Semantic: Text (Layer 2, themed)",
      prefix: "--text-",
      usage: {
        "--text-primary": "Primary body text",
        "--text-secondary": "Supporting text",
        "--text-tertiary": "Placeholder text",
        "--text-inverse": "Text on inverse surfaces",
        "--text-link": "Link text",
        "--text-link-hover": "Link hover",
      },
    },
    {
      title: "Semantic: Borders (Layer 2, themed)",
      prefix: "--border-",
      filter: (name) =>
        ["--border-primary", "--border-secondary", "--border-focus"].includes(
          name
        ),
      usage: {
        "--border-primary": "Default borders",
        "--border-secondary": "Stronger borders",
        "--border-focus": "Focus ring color",
      },
    },
    {
      title: "Semantic: Interactive (Layer 2, themed)",
      prefix: "--interactive-",
      usage: {
        "--interactive-primary": "Primary buttons",
        "--interactive-primary-hover": "Primary hover",
        "--interactive-primary-bg": "Subtle primary background",
        "--interactive-secondary": "Secondary buttons",
        "--interactive-secondary-hover": "Secondary hover",
      },
    },
    {
      title: "Semantic: Status (Layer 2, themed)",
      prefix: "--status-",
      usage: {
        "--status-success": "Success text/icons",
        "--status-warning": "Warning text/icons",
        "--status-error": "Error text/icons",
        "--status-info": "Info text/icons",
        "--status-success-bg": "Success background",
        "--status-warning-bg": "Warning background",
        "--status-error-bg": "Error background",
        "--status-info-bg": "Info background",
        "--status-unopened-bg": "Unopened badge background",
        "--status-unopened": "Unopened badge text",
      },
    },
    {
      title: "Semantic: Component-Specific (Layer 2, themed)",
      filter: (name) => ["--modal-handle-bg"].includes(name),
      usage: {
        "--modal-handle-bg": "Modal drag handle color",
      },
    },
  ];

  for (const cat of themedCategories) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(`## ${cat.title}`);
    lines.push("");
    lines.push("| Token | Dark | Light | Usage |");
    lines.push("|-------|------|-------|-------|");

    const tokenNames = cat.filter
      ? [...darkTokens.keys()].filter(cat.filter)
      : [...darkTokens.keys()].filter((n) => n.startsWith(cat.prefix));

    for (const name of tokenNames) {
      const dark = darkTokens.get(name);
      const light = lightTokens.get(name);
      const usage = cat.usage?.[name] || "";
      const darkVal = dark ? escapeForTable(dark.value) : "";
      const lightVal = light ? escapeForTable(light.value) : darkVal;
      lines.push(
        `| \`${name}\` | \`${darkVal}\` | \`${lightVal}\` | ${usage} |`
      );
    }
  }

  // Layer 2 non-themed semantic tokens
  const nonThemedGroups = groupBySection(semanticNonThemed);
  const nonThemedHeadings = {
    "Opacity": "Semantic: Opacity (Layer 2)",
    "Z-Index Scale": "Semantic: Z-Index (Layer 2)",
    "Border": "Semantic: Border Width (Layer 2)",
    "Sizing: Icons & Controls": "Semantic: Sizing — Icons & Controls (Layer 2)",
    "Sizing: Toggle": "Semantic: Sizing — Toggle (Layer 2)",
    "Sizing: Checkbox": "Semantic: Sizing — Checkbox (Layer 2)",
    "Sizing: Progress": "Semantic: Sizing — Progress (Layer 2)",
    "Sizing: Dot / Badge": "Semantic: Sizing — Dot / Badge (Layer 2)",
    "Sizing: Images": "Semantic: Sizing — Images (Layer 2)",
    "Layout: Max Widths": "Semantic: Layout (Layer 2)",
    "Layout: Page": null, // subsection
    "Layout: Content": null,
    "Layout: Cards": null,
    "Layout: Header": null,
    "Layout: Toolbar": null,
    "Buttons": "Semantic: Button (Layer 2)",
    "Modal": "Semantic: Modal (Layer 2)",
    "Form": "Semantic: Form (Layer 2)",
    "Focus Ring": "Semantic: Focus Ring (Layer 2)",
    "Shadow: Component-specific": "Semantic: Shadow — Component (Layer 2)",
    "Overlay": "Semantic: Overlay (Layer 2)",
  };

  // Also include themed shadows (card, dropdown) in shadow section
  const themedShadowTokens = ["--shadow-card", "--shadow-dropdown"];
  const modalHandleToken = "--modal-handle-bg";

  for (const group of nonThemedGroups) {
    const h2 = nonThemedHeadings[group.section];

    // Layout subsections
    if (group.section && group.section.startsWith("Layout: ") && group.section !== "Layout: Max Widths") {
      const subName = group.section.replace("Layout: ", "");
      lines.push("");
      lines.push(`### ${subName} Layout`);
    } else if (h2) {
      lines.push("");
      lines.push("---");
      lines.push("");
      lines.push(`## ${h2}`);

      if (group.section === "Layout: Max Widths") {
        lines.push("");
        lines.push("### Max/Min Widths");
      }
    } else if (h2 === undefined) {
      continue;
    }

    // Special handling for shadows — include themed
    if (group.section === "Shadow: Component-specific") {
      lines.push("");
      lines.push("### Themed (Dark/Light differ)");
      lines.push("");
      lines.push("| Token | Dark | Light | Usage |");
      lines.push("|-------|------|-------|-------|");
      for (const name of themedShadowTokens) {
        const dark = darkTokens.get(name);
        const light = lightTokens.get(name);
        const usage = name === "--shadow-card" ? "Card elevation" : "Dropdown/popover elevation";
        lines.push(
          `| \`${name}\` | \`${escapeForTable(dark?.value || "")}\` | \`${escapeForTable(light?.value || "")}\` | ${usage} |`
        );
      }
      lines.push("");
      lines.push("### Non-themed");
    }

    // Determine columns
    const hasVarRefs = group.props.some((p) => p.value.includes("var("));

    lines.push("");
    lines.push("| Token | Value | Usage |");
    lines.push("|-------|-------|-------|");

    for (const p of group.props) {
      let displayValue = escapeForTable(p.value);
      const px = remToPx(p.value);
      if (px) displayValue += ` (${px})`;

      // For var() references, try to add resolved px (supports multi-value tokens)
      const varMatches = [...p.value.matchAll(/var\((--[\w-]+)\)/g)];
      if (varMatches.length > 0) {
        const allTokens = [...(tokens.primitives || []), ...(tokens.semanticNonThemed || [])];
        const resolvedParts = [];
        let allResolved = true;
        for (const vm of varMatches) {
          const refProp = allTokens.find((t) => t.name === vm[1]);
          if (refProp) {
            const refPx = remToPx(refProp.value);
            if (refPx) {
              resolvedParts.push(refPx);
            } else if (refProp.value && !refProp.value.includes("var(")) {
              resolvedParts.push(refProp.value);
            } else {
              allResolved = false;
            }
          } else {
            allResolved = false;
          }
        }
        if (allResolved && resolvedParts.length > 0) {
          displayValue = `${escapeForTable(p.value)} (${resolvedParts.join(" ")})`;
        }
      }

      const usage = p.inlineComment || "";
      lines.push(`| \`${p.name}\` | \`${displayValue}\` | ${escapeForTable(usage)} |`);
    }
  }

  // Modal handle themed token
  if (darkTokens.has(modalHandleToken)) {
    // Already included in Modal section via non-themed; add themed info
  }

  // Overlay section from non-themed already handled

  return lines.join("\n") + "\n";
}

// ============================================================================
// Foundation Spec Generators
// ============================================================================

/**
 * Generate a foundation spec file.
 * Uses markers in existing file to preserve hand-authored content.
 * If no markers exist, generates the full file.
 */
function generateFoundationSpec(specPath, generatedContent) {
  if (!fs.existsSync(specPath)) {
    return generatedContent;
  }

  const existing = fs.readFileSync(specPath, "utf-8");
  const startMarker = "<!-- GENERATED:START -->";
  const endMarker = "<!-- GENERATED:END -->";

  if (existing.includes(startMarker) && existing.includes(endMarker)) {
    // Replace content between markers
    const before = existing.slice(0, existing.indexOf(startMarker) + startMarker.length);
    const after = existing.slice(existing.indexOf(endMarker));
    return before + "\n" + generatedContent + "\n" + after;
  }

  // No markers — return full generated content
  return generatedContent;
}

function generateColorSpec(tokens) {
  const { primitives, darkTokens, lightTokens, monoTokens } = tokens;
  const lines = [];

  lines.push("<!-- This file is auto-generated by scripts/generate-specs.js. Do not edit token tables manually. -->");
  lines.push("");
  lines.push("# Color");
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push("Eggo uses a neutral gray palette with orange accent for the \"baseplate\" theme and monochrome for the \"mono\" theme. Colors are organized in three tiers: primitive palette (Layer 1) → semantic theme tokens (Layer 2) → component usage (Layer 3).");
  lines.push("");
  lines.push("## Color Modes");
  lines.push("");
  lines.push("- **Dark** (default): Gray-950 background, light text");
  lines.push("- **Light**: Gray-50 background, dark text");
  lines.push("- **System**: Follows OS preference via `prefers-color-scheme`");
  lines.push("");
  lines.push("Color mode is set via `data-theme` attribute on the root element. Values: `dark`, `light`, or unset (system).");
  lines.push("");
  lines.push("## UI Themes");
  lines.push("");
  lines.push("- **Baseplate** (default): Orange accent color for interactive elements");
  lines.push("- **Mono**: Monochrome palette — light buttons on dark, dark buttons on light. No orange.");
  lines.push("");
  lines.push("UI theme is set via `data-ui-theme` attribute. Value: `mono` or unset (baseplate).");

  // Annotations for neutral colors
  const colorNotes = {
    "--color-white": "Pure white",
    "--color-black": "Pure black",
    "--color-gray-50": "Lightest gray",
    "--color-gray-500": "Mid gray",
    "--color-gray-850": "Non-standard step",
    "--color-gray-950": "Darkest gray",
  };

  // Primitive palette sections
  const colorSections = {
    "Colors: Neutral": { title: "Neutrals", hasNotes: true },
    "Colors: Accent — Orange": { title: "Accent — Orange", hasNotes: false },
    "Colors: Brand Palette": { title: "Brand Palette", hasNotes: false },
    "Colors: Status": { title: "Status", hasNotes: false },
  };

  lines.push("");
  lines.push("## Primitive Palette");

  for (const prim of primitives) {
    const sectionDef = colorSections[prim.section];
    if (!sectionDef) continue;
    // Only emit header once per section
    if (!colorSections[prim.section]._emitted) {
      colorSections[prim.section]._emitted = true;
      lines.push("");
      lines.push(`### ${sectionDef.title}`);
      lines.push("");
      if (sectionDef.hasNotes) {
        lines.push("| Token | Value | Description |");
        lines.push("|-------|-------|-------------|");
      } else {
        lines.push("| Token | Value |");
        lines.push("|-------|-------|");
      }
    }

    if (sectionDef.hasNotes) {
      const desc = prim.inlineComment || colorNotes[prim.name] || "";
      lines.push(`| \`${prim.name}\` | \`${prim.value}\` | ${desc} |`);
    } else {
      lines.push(`| \`${prim.name}\` | \`${prim.value}\` |`);
    }
  }

  // Semantic themed color tokens
  const semanticCategories = [
    { title: "Surfaces", prefix: "--surface-", usage: {
      "--surface-background": "Page background",
      "--surface-primary": "Card backgrounds, primary surfaces",
      "--surface-secondary": "Secondary/nested surfaces",
      "--surface-tertiary": "Tertiary surfaces, hover states",
      "--surface-inverse": "Inverted surfaces (e.g., tooltips)",
    }},
    { title: "Text", prefix: "--text-", usage: {
      "--text-primary": "Primary body text",
      "--text-secondary": "Secondary/supporting text",
      "--text-tertiary": "Tertiary/placeholder text",
      "--text-inverse": "Text on inverse surfaces",
      "--text-link": "Link text",
      "--text-link-hover": "Link hover text",
    }},
    { title: "Borders", prefix: "--border-", filter: (n) => ["--border-primary", "--border-secondary", "--border-focus"].includes(n), usage: {
      "--border-primary": "Default borders",
      "--border-secondary": "Stronger borders",
      "--border-focus": "Focus ring color",
    }},
    { title: "Interactive", prefix: "--interactive-", usage: {
      "--interactive-primary": "Primary action buttons, active toggles",
      "--interactive-primary-hover": "Primary action hover",
      "--interactive-primary-bg": "Subtle primary background",
      "--interactive-secondary": "Secondary buttons, toggles off",
      "--interactive-secondary-hover": "Secondary hover",
    }},
    { title: "Status", prefix: "--status-", usage: {
      "--status-success": "Success text/icons",
      "--status-warning": "Warning text/icons",
      "--status-error": "Error text/icons",
      "--status-info": "Info text/icons",
      "--status-success-bg": "Success badge/alert background",
      "--status-warning-bg": "Warning badge/alert background",
      "--status-error-bg": "Error badge/alert background",
      "--status-info-bg": "Info badge/alert background",
      "--status-unopened-bg": "Unopened badge background",
      "--status-unopened": "Unopened badge text",
    }},
  ];

  lines.push("");
  lines.push("## Semantic Tokens (themed)");

  for (const cat of semanticCategories) {
    lines.push("");
    lines.push(`### ${cat.title}`);
    lines.push("");
    lines.push("| Token | Dark | Light | Usage |");
    lines.push("|-------|------|-------|-------|");

    const tokenNames = cat.filter
      ? [...darkTokens.keys()].filter(cat.filter)
      : [...darkTokens.keys()].filter((n) => n.startsWith(cat.prefix));

    for (const name of tokenNames) {
      const dark = darkTokens.get(name);
      const light = lightTokens.get(name);
      const usage = cat.usage?.[name] || "";
      // For display: show var reference + resolved hex if available
      const darkDisplay = dark ? formatThemedValue(dark.value, primitives) : "";
      const lightDisplay = light ? formatThemedValue(light.value, primitives) : darkDisplay;
      lines.push(`| \`${name}\` | \`${escapeForTable(darkDisplay)}\` | \`${escapeForTable(lightDisplay)}\` | ${usage} |`);
    }
  }

  // Mono theme overrides
  lines.push("");
  lines.push("## Mono Theme Overrides");
  lines.push("");
  lines.push("In mono theme, the interactive and link tokens change based on color mode:");

  const monoSections = [
    { title: "Mono + Dark", map: monoTokens.dark },
    { title: "Mono + Light", map: monoTokens.light },
  ];

  for (const sec of monoSections) {
    lines.push("");
    lines.push(`### ${sec.title}`);
    lines.push("");
    lines.push("| Token | Value |");
    lines.push("|-------|-------|");
    for (const [name, value] of sec.map) {
      const display = formatThemedValue(value, primitives);
      lines.push(`| \`${name}\` | \`${escapeForTable(display)}\` |`);
    }
  }

  // Overlays (from tokens.css non-themed)
  const overlayTokens = tokens.semanticNonThemed.filter((p) => p.name.startsWith("--overlay-"));
  lines.push("");
  lines.push("## Overlays");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");
  const overlayUsage = {
    "--overlay-dark": "Modal/drawer backdrop",
    "--overlay-light-20": "Subtle light overlay",
    "--overlay-light-30": "Medium light overlay",
    "--overlay-light-40": "Strong light overlay",
  };
  for (const p of overlayTokens) {
    lines.push(`| \`${p.name}\` | \`${escapeForTable(p.value)}\` | ${overlayUsage[p.name] || ""} |`);
  }

  // Themed shadows
  lines.push("");
  lines.push("## Shadows (themed)");
  lines.push("");
  lines.push("| Token | Dark | Light |");
  lines.push("|-------|------|-------|");
  for (const name of ["--shadow-card", "--shadow-dropdown"]) {
    const dark = darkTokens.get(name);
    const light = lightTokens.get(name);
    lines.push(`| \`${name}\` | \`${escapeForTable(dark?.value || "")}\` | \`${escapeForTable(light?.value || "")}\` |`);
  }

  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push("- Never use hex/rgb colors in components — always reference semantic tokens.");
  lines.push("- Status colors should only be used for status-related UI.");
  lines.push("- Use `--surface-*` tokens for backgrounds, `--text-*` tokens for text.");
  lines.push("- Use `--interactive-*` tokens for buttons and interactive controls.");
  lines.push("- Use `--border-*` tokens for all border colors.");
  lines.push("- Never reference Layer 1 primitives (`--color-gray-*`, `--color-orange-*`) directly in component CSS.");

  return lines.join("\n") + "\n";
}

/**
 * Format a themed value for display: var(--token) → --token (#hex)
 */
function formatThemedValue(value, primitives) {
  const varMatch = value.match(/^var\((--[\w-]+)\)$/);
  if (varMatch) {
    const refName = varMatch[1];
    const prim = primitives.find((p) => p.name === refName);
    if (prim) {
      return `${refName} (${prim.value})`;
    }
    return refName;
  }
  return value;
}

function generateSpacingSpec(tokens) {
  const lines = [];
  lines.push("<!-- This file is auto-generated by scripts/generate-specs.js. Do not edit token tables manually. -->");
  lines.push("");
  lines.push("# Spacing");
  lines.push("");
  lines.push("## Scale");
  lines.push("");
  lines.push("All spacing uses a 4px base unit. Use `--space-*` tokens for padding, margin, and gap.");
  lines.push("");
  lines.push("| Token | Value | px Equivalent |");
  lines.push("|-------|-------|---------------|");

  const spaceTokens = tokens.primitives.filter((p) => p.name.startsWith("--space-"));
  for (const p of spaceTokens) {
    const px = remToPx(p.value) || p.inlineComment || p.value;
    lines.push(`| \`${p.name}\` | \`${p.value}\` | ${px} |`);
  }

  // Layout tokens from semantic non-themed
  const layoutSections = [
    { title: "Page", prefix: "--layout-page-" },
    { title: "Content", prefix: "--layout-content-" },
    { title: "Header", prefix: "--layout-header-", also: ["--layout-banner-height"] },
    { title: "Cards", prefix: "--layout-card-", also: ["--layout-carousel-card-width"] },
    { title: "Toolbar", prefix: "--layout-toolbar-" },
  ];

  lines.push("");
  lines.push("## Layout Tokens");

  for (const sec of layoutSections) {
    lines.push("");
    lines.push(`### ${sec.title}`);
    lines.push("");
    lines.push("| Token | Value | Usage |");
    lines.push("|-------|-------|-------|");

    const matching = tokens.semanticNonThemed.filter(
      (p) => p.name.startsWith(sec.prefix) || (sec.also && sec.also.includes(p.name))
    );
    for (const p of matching) {
      let displayVal = p.value;
      // Resolve all var() refs to show px values
      const varMatches = [...p.value.matchAll(/var\((--[\w-]+)\)/g)];
      if (varMatches.length > 0) {
        const allTokens = [...tokens.primitives, ...tokens.semanticNonThemed];
        const parts = [];
        for (const vm of varMatches) {
          const ref = allTokens.find((t) => t.name === vm[1]);
          if (ref) {
            const refPx = remToPx(ref.value);
            parts.push(refPx ? `${vm[1]} (${refPx})` : vm[1]);
          } else {
            parts.push(vm[1]);
          }
        }
        displayVal = parts.join(" ");
      }
      lines.push(`| \`${p.name}\` | \`${escapeForTable(displayVal)}\` | ${p.inlineComment || ""} |`);
    }
  }

  // Max/Min width tokens
  lines.push("");
  lines.push("## Max/Min Width Tokens");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");

  const widthTokens = tokens.semanticNonThemed.filter(
    (p) =>
      (p.name.startsWith("--max-width-") ||
        p.name.startsWith("--min-width-") ||
        p.name === "--layout-max-width") &&
      !p.name.startsWith("--layout-card-") &&
      !p.name.startsWith("--layout-header-")
  );
  for (const p of widthTokens) {
    lines.push(`| \`${p.name}\` | \`${escapeForTable(p.value)}\` | ${p.inlineComment || ""} |`);
  }

  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push("- Use `--space-*` tokens for padding, margin, and gap.");
  lines.push("- Use `--layout-*` tokens for page structure and grid layout.");
  lines.push("- Use `--max-width-*` and `--min-width-*` tokens for width constraints.");
  lines.push("- Never use raw px or rem values in component CSS.");
  lines.push("- The spacing scale is intentionally non-linear — there is no `--space-7`, `--space-9`, etc.");

  return lines.join("\n") + "\n";
}

function generateTypographySpec(tokens) {
  const lines = [];
  lines.push("<!-- This file is auto-generated by scripts/generate-specs.js. Do not edit token tables manually. -->");
  lines.push("");
  lines.push("# Typography");
  lines.push("");
  lines.push("## Font Families");
  lines.push("");
  lines.push("| Token | Font | Usage |");
  lines.push("|-------|------|-------|");
  lines.push("| `--font-inter` | Inter | Body text, UI labels, buttons — all general typography |");
  lines.push("| `--font-instrument-serif` | Instrument Serif | Headings in mono theme only |");
  lines.push("| `--font-heading` | `var(--font-instrument-serif), Georgia, serif` | Set by mono theme; used by h1–h6 elements |");
  lines.push("");
  lines.push("Inter is loaded as the base font on the `body` element. Instrument Serif is only activated when `data-ui-theme=\"mono\"` is set.");

  // Font sizes
  const fontSizes = tokens.primitives.filter((p) => p.name.startsWith("--font-size-"));
  lines.push("");
  lines.push("## Font Size Scale");
  lines.push("");
  lines.push("| Token | Value | px Equivalent |");
  lines.push("|-------|-------|---------------|");
  for (const p of fontSizes) {
    const px = remToPx(p.value) || p.inlineComment || "";
    lines.push(`| \`${p.name}\` | \`${p.value}\` | ${px} |`);
  }

  // Font weights
  const fontWeights = tokens.primitives.filter((p) => p.name.startsWith("--font-weight-"));
  lines.push("");
  lines.push("## Font Weights");
  lines.push("");
  lines.push("| Token | Value |");
  lines.push("|-------|-------|");
  for (const p of fontWeights) {
    lines.push(`| \`${p.name}\` | \`${p.value}\` |`);
  }

  // Line heights
  const lineHeights = tokens.primitives.filter((p) => p.name.startsWith("--line-height-"));
  const lineHeightUsage = {
    "--line-height-none": "Single-line elements (icons, badges)",
    "--line-height-tight": "Large headings",
    "--line-height-snug": "Small headings, compact text",
    "--line-height-normal": "Body text (default)",
    "--line-height-relaxed": "Long-form reading text",
  };
  lines.push("");
  lines.push("## Line Heights");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");
  for (const p of lineHeights) {
    lines.push(`| \`${p.name}\` | \`${p.value}\` | ${lineHeightUsage[p.name] || ""} |`);
  }

  // Letter spacing
  const letterSpacings = tokens.primitives.filter((p) => p.name.startsWith("--letter-spacing-"));
  const letterUsage = {
    "--letter-spacing-tighter": "Large display text",
    "--letter-spacing-tight": "Headings",
    "--letter-spacing-normal": "Body text (default)",
    "--letter-spacing-wide": "Uppercase labels, small caps",
    "--letter-spacing-wider": "Extra-wide tracking",
  };
  lines.push("");
  lines.push("## Letter Spacing");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");
  for (const p of letterSpacings) {
    lines.push(`| \`${p.name}\` | \`${p.value}\` | ${letterUsage[p.name] || ""} |`);
  }

  // Mono theme overrides
  lines.push("");
  lines.push("## Mono Theme Overrides");
  lines.push("");
  lines.push("When `data-ui-theme=\"mono\"` is active, all h1–h6 elements receive:");
  lines.push("");
  lines.push("- `font-family: var(--font-heading)` (Instrument Serif with Georgia/serif fallbacks)");
  lines.push("- `font-weight: var(--font-weight-normal)` (400)");
  lines.push("- `letter-spacing: var(--letter-spacing-tight)` (-0.01em)");
  lines.push("");
  lines.push("### Heading Sizes in Mono Theme");
  lines.push("");
  lines.push("| Element | Font Size | Line Height |");
  lines.push("|---------|-----------|-------------|");
  lines.push("| `h1` | `--font-size-3xl` (28px) | `--line-height-tight` (1.2) |");
  lines.push("| `h2` | `--font-size-xl` (18px) | `--line-height-snug` (1.35) |");
  lines.push("| `h3` | `--font-size-xl` (18px) | `--line-height-snug` (1.35) |");

  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push("- Never use raw font sizes — always use `var(--font-size-*)`.");
  lines.push("- Never use numeric font weights — always use `var(--font-weight-*)`.");
  lines.push("- Never use raw line-height numbers — always use `var(--line-height-*)`.");
  lines.push("- Never use raw letter-spacing values — always use `var(--letter-spacing-*)`.");
  lines.push("- The `--font-heading` variable is only defined inside `[data-ui-theme='mono']` — do not reference it outside that context.");

  return lines.join("\n") + "\n";
}

function generateRadiusSpec(tokens) {
  const lines = [];
  lines.push("<!-- This file is auto-generated by scripts/generate-specs.js. Do not edit token tables manually. -->");
  lines.push("");
  lines.push("# Border Radius");
  lines.push("");
  lines.push("## Scale");
  lines.push("");
  lines.push("| Token | Value | px Equivalent |");
  lines.push("|-------|-------|---------------|");

  const radiusTokens = tokens.primitives.filter((p) => p.name.startsWith("--radius-"));
  for (const p of radiusTokens) {
    const px = remToPx(p.value);
    const equiv = px || (p.value === "9999px" ? "Fully rounded (pill/circle)" : p.value);
    lines.push(`| \`${p.name}\` | \`${p.value}\` | ${equiv} |`);
  }

  lines.push("");
  lines.push("## Component Defaults");
  lines.push("");
  lines.push("| Component | Token | Resolves To |");
  lines.push("|-----------|-------|-------------|");
  lines.push("| Buttons | `--button-radius` | `--radius-md` (8px) |");
  lines.push("| Modals | `--radius-xl` | 16px |");
  lines.push("| Cards | `--radius-lg` | 12px |");
  lines.push("| Inputs | `--radius-md` | 8px |");
  lines.push("| Badges | `--radius-sm` | 6px |");
  lines.push("| Pills / Chips | `--radius-full` | 9999px |");
  lines.push("| Header | `--layout-header-radius` | `--radius-2xl` (20px) |");

  lines.push("");
  lines.push("## Mono Theme Override");
  lines.push("");
  lines.push("In the mono theme (`data-ui-theme=\"mono\"`), all buttons, `[role=\"button\"]` elements, and button-like anchors are forced to `border-radius: var(--radius-full) !important`, creating capsule-shaped buttons regardless of the default `--button-radius` value.");

  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push("- Never use raw `border-radius` values — always reference `--radius-*` tokens.");
  lines.push("- Use the `--button-radius` alias for buttons so the mono theme override works correctly.");
  lines.push("- Use `--radius-full` for circular elements (avatars, dots) and pill shapes.");

  return lines.join("\n") + "\n";
}

function generateElevationSpec(tokens) {
  const { primitives, darkTokens, lightTokens, semanticNonThemed } = tokens;
  const lines = [];
  lines.push("<!-- This file is auto-generated by scripts/generate-specs.js. Do not edit token tables manually. -->");
  lines.push("");
  lines.push("# Elevation & Shadows");
  lines.push("");
  lines.push("## Shadow Scale");
  lines.push("");
  lines.push("### Primitive Shadows (Layer 1)");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");

  const shadowPrimitives = primitives.filter((p) => p.name.startsWith("--shadow-"));
  const shadowPrimUsage = {
    "--shadow-sm": "Subtle lift (small controls)",
    "--shadow-md": "Medium elevation",
    "--shadow-lg": "High elevation",
  };
  for (const p of shadowPrimitives) {
    lines.push(`| \`${p.name}\` | \`${escapeForTable(p.value)}\` | ${shadowPrimUsage[p.name] || ""} |`);
  }

  lines.push("");
  lines.push("### Themed Shadows (Layer 2)");
  lines.push("");
  lines.push("| Token | Dark | Light | Usage |");
  lines.push("|-------|------|-------|-------|");
  const themedShadows = [
    { name: "--shadow-card", usage: "Card surfaces" },
    { name: "--shadow-dropdown", usage: "Dropdown menus, popovers" },
  ];
  for (const s of themedShadows) {
    const dark = darkTokens.get(s.name);
    const light = lightTokens.get(s.name);
    lines.push(`| \`${s.name}\` | \`${escapeForTable(dark?.value || "")}\` | \`${escapeForTable(light?.value || "")}\` | ${s.usage} |`);
  }

  lines.push("");
  lines.push("Dark mode uses heavier shadow opacity (0.3–0.4) compared to light mode (0.1) to maintain visual depth on dark backgrounds.");

  lines.push("");
  lines.push("### Component-Specific Shadows (Layer 2)");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");
  const compShadows = semanticNonThemed.filter(
    (p) => p.name.startsWith("--shadow-") && !["--shadow-card", "--shadow-dropdown"].includes(p.name)
  );
  const compShadowUsage = {
    "--shadow-toggle-knob": "Toggle switch knob",
    "--shadow-banner": "Bottom banner (upward shadow)",
  };
  for (const p of compShadows) {
    lines.push(`| \`${p.name}\` | \`${escapeForTable(p.value)}\` | ${compShadowUsage[p.name] || ""} |`);
  }

  // Z-Index
  lines.push("");
  lines.push("## Z-Index Scale");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");
  const zTokens = semanticNonThemed.filter((p) => p.name.startsWith("--z-"));
  const zUsage = {
    "--z-base": "Default stacking context",
    "--z-above": "Slightly above siblings",
    "--z-dropdown": "Dropdown menus",
    "--z-sticky": "Sticky elements (toolbar)",
    "--z-header": "App header",
    "--z-overlay": "Modal backdrop overlay",
    "--z-modal": "Modal dialog (above overlay)",
    "--z-banner": "Banners (above everything)",
    "--z-progress": "Progress bar (topmost)",
  };
  for (const p of zTokens) {
    lines.push(`| \`${p.name}\` | \`${p.value}\` | ${zUsage[p.name] || ""} |`);
  }

  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push("- Never use raw `box-shadow` values — always reference `--shadow-*` tokens.");
  lines.push("- Never use raw `z-index` numbers — always reference `--z-*` tokens.");
  lines.push("- Use themed shadows (`--shadow-card`, `--shadow-dropdown`) for surfaces that need to adapt between color modes.");
  lines.push("- Use primitive shadows (`--shadow-sm`, `--shadow-md`, `--shadow-lg`) only when a non-themed shadow is intentional.");
  lines.push("- The z-index scale is intentionally sparse to allow insertions if needed.");

  return lines.join("\n") + "\n";
}

function generateMotionSpec(tokens) {
  const { primitives, semanticNonThemed } = tokens;
  const lines = [];
  lines.push("<!-- This file is auto-generated by scripts/generate-specs.js. Do not edit token tables manually. -->");
  lines.push("");
  lines.push("# Motion & Transitions");
  lines.push("");
  lines.push("## Duration Scale");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");

  const durations = primitives.filter((p) => p.name.startsWith("--duration-"));
  const durationUsage = {
    "--duration-fast": "Micro-interactions (hover, focus)",
    "--duration-normal": "Standard transitions (color, opacity)",
    "--duration-slow": "Larger transitions (expand/collapse)",
    "--duration-slower": "Complex animations (page transitions)",
    "--duration-spin": "Spinner rotation cycle",
    "--duration-shimmer": "Skeleton loading shimmer",
    "--duration-progress": "Progress bar animation",
  };
  for (const p of durations) {
    lines.push(`| \`${p.name}\` | \`${p.value}\` | ${durationUsage[p.name] || ""} |`);
  }

  lines.push("");
  lines.push("## Transition Presets");
  lines.push("");
  lines.push("Combines duration and easing into a single token for use with the CSS `transition` property.");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");

  const transitions = primitives.filter((p) => p.name.startsWith("--transition-"));
  const transitionUsage = {
    "--transition-fast": "Hover/focus state changes",
    "--transition-normal": "General property transitions",
    "--transition-slow": "Expand/collapse, slide",
    "--transition-slower": "Large layout shifts",
    "--transition-progress": "Progress bar width changes",
  };
  for (const p of transitions) {
    lines.push(`| \`${p.name}\` | \`${escapeForTable(p.value)}\` | ${transitionUsage[p.name] || ""} |`);
  }

  lines.push("");
  lines.push("## Easing Curves");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");
  const easings = primitives.filter((p) => p.name.startsWith("--ease-"));
  const easingUsage = {
    "--ease-out": "Entering elements (fast start, gentle stop)",
    "--ease-in-out": "General-purpose easing",
    "--ease-vaul": "Drawer/sheet animations (Vaul-style spring)",
  };
  for (const p of easings) {
    lines.push(`| \`${p.name}\` | \`${escapeForTable(p.value)}\` | ${easingUsage[p.name] || ""} |`);
  }

  lines.push("");
  lines.push("## Opacity Scale");
  lines.push("");
  lines.push("Opacity tokens are Layer 2 non-themed aliases defined in `tokens.css` (not `theme.css`) because they are identical in light and dark modes.");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");
  const opacities = semanticNonThemed.filter((p) => p.name.startsWith("--opacity-"));
  const opacityUsage = {
    "--opacity-disabled": "Disabled controls",
    "--opacity-muted": "Muted/de-emphasized elements",
    "--opacity-active": "Active/pressed state",
    "--opacity-hover": "Hover state",
    "--opacity-subtle": "Slightly faded",
  };
  for (const p of opacities) {
    lines.push(`| \`${p.name}\` | \`${p.value}\` | ${opacityUsage[p.name] || ""} |`);
  }

  // View Transitions (hand-authored content preserved as-is)
  lines.push("");
  lines.push("## View Transitions");
  lines.push("");
  lines.push("The add-set form uses the native View Transitions API to animate between multi-step form pages. Transition groups are assigned via `view-transition-name` in component CSS. Direction is controlled by a `data-vt-direction` attribute on the `<html>` element (`\"forward\"` or `\"back\"`).");
  lines.push("");
  lines.push("### Transition Groups");
  lines.push("");
  lines.push("| Group | Duration | Easing | Behavior |");
  lines.push("|-------|----------|--------|----------|");
  lines.push("| `add-set-modal` | `0ms` | — | No animation (persistent chrome) |");
  lines.push("| `add-set-header` | `200ms` | `ease-out` | Morphs header content changes |");
  lines.push("| `add-set-actions` | `200ms` | `ease-out` | Morphs footer button text |");
  lines.push("| `add-set-image` | `300ms` (forward), `250ms` (back) | `cubic-bezier(0.4, 0, 0.2, 1)` | Morphs image between preview and compact |");
  lines.push("| `add-set-name` | `300ms` (forward), `250ms` (back) | `cubic-bezier(0.4, 0, 0.2, 1)` | Morphs set name position |");
  lines.push("| `add-set-content` | Sequenced crossfade | `ease-out` | Step content area |");
  lines.push("");
  lines.push("### Content Crossfade Timing");
  lines.push("");
  lines.push("| Direction | Old (fade out) | New (fade in) |");
  lines.push("|-----------|----------------|---------------|");
  lines.push("| Forward | `120ms ease-out` | `180ms ease-out`, `200ms` delay |");
  lines.push("| Back | `100ms ease-out` | `150ms ease-out`, `150ms` delay |");
  lines.push("");
  lines.push("The delay on the incoming content ensures the morph animations settle before new content appears.");
  lines.push("");
  lines.push("## Reduced Motion");
  lines.push("");
  lines.push("All view transition animations are disabled when `prefers-reduced-motion: reduce` is active. Durations and delays are set to `0ms` for all transition groups.");

  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push("- Always use `--duration-*` tokens for `animation-duration` and `transition-duration`.");
  lines.push("- Always use `--transition-*` tokens for `transition` shorthand values.");
  lines.push("- Always use `--ease-*` tokens for `animation-timing-function` and `transition-timing-function`.");
  lines.push("- Always use `--opacity-*` tokens for opacity states.");
  lines.push("- Respect `prefers-reduced-motion` — disable or minimize animations for users who request it.");
  lines.push("- Never use raw millisecond or cubic-bezier values in component CSS.");

  return lines.join("\n") + "\n";
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const checkMode = process.argv.includes("--check");
  const tokens = parseTokens();

  const outputs = [
    {
      path: path.join(SPECS_DIR, "tokens", "token-reference.md"),
      content: generateTokenReference(tokens),
    },
    {
      path: path.join(SPECS_DIR, "foundations", "color.md"),
      content: generateColorSpec(tokens),
    },
    {
      path: path.join(SPECS_DIR, "foundations", "spacing.md"),
      content: generateSpacingSpec(tokens),
    },
    {
      path: path.join(SPECS_DIR, "foundations", "typography.md"),
      content: generateTypographySpec(tokens),
    },
    {
      path: path.join(SPECS_DIR, "foundations", "radius.md"),
      content: generateRadiusSpec(tokens),
    },
    {
      path: path.join(SPECS_DIR, "foundations", "elevation.md"),
      content: generateElevationSpec(tokens),
    },
    {
      path: path.join(SPECS_DIR, "foundations", "motion.md"),
      content: generateMotionSpec(tokens),
    },
  ];

  if (checkMode) {
    let stale = false;
    for (const out of outputs) {
      const relPath = path.relative(process.cwd(), out.path);
      if (!fs.existsSync(out.path)) {
        console.log(`\x1b[31m✗\x1b[0m ${relPath} — missing (run \`node scripts/generate-specs.js\` to create)`);
        stale = true;
        continue;
      }
      const existing = fs.readFileSync(out.path, "utf-8");
      if (existing !== out.content) {
        console.log(`\x1b[31m✗\x1b[0m ${relPath} — stale (run \`node scripts/generate-specs.js\` to update)`);
        stale = true;
      } else {
        console.log(`\x1b[32m✓\x1b[0m ${relPath}`);
      }
    }

    if (stale) {
      console.log(
        "\n\x1b[31mSpec files are out of date.\x1b[0m Run `node scripts/generate-specs.js` and commit the changes."
      );
      process.exit(1);
    } else {
      console.log("\n\x1b[32m✓ All generated specs are up to date.\x1b[0m");
      process.exit(0);
    }
  }

  // Generate mode
  for (const out of outputs) {
    const relPath = path.relative(process.cwd(), out.path);
    fs.writeFileSync(out.path, out.content);
    console.log(`\x1b[32m✓\x1b[0m ${relPath}`);
  }

  console.log(`\n\x1b[32mGenerated ${outputs.length} spec files.\x1b[0m`);
}

main();

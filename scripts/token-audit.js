#!/usr/bin/env node

/**
 * Token Audit Script
 *
 * Scans all CSS files for hardcoded visual values that should use design tokens.
 * Prints file, line number, violation, and suggested token replacement.
 * Returns exit code 1 if any errors are found (CI-ready).
 *
 * Usage:
 *   node scripts/token-audit.js          # scan all CSS files
 *   node scripts/token-audit.js --fix    # (future) auto-fix mode
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");

// Files that define tokens (exempt from audit)
const TOKEN_FILES = new Set([
  path.resolve(SRC_DIR, "styles/tokens.css"),
  path.resolve(SRC_DIR, "styles/theme.css"),
]);

// ============================================================================
// Token suggestion maps
// ============================================================================

const COLOR_HEX_MAP = {
  "#ffffff": "--color-white",
  "#fff": "--color-white",
  "#000000": "--color-black",
  "#000": "--color-black",
  "#fafafa": "--color-gray-50",
  "#f4f4f5": "--color-gray-100",
  "#e4e4e7": "--color-gray-200",
  "#d4d4d8": "--color-gray-300",
  "#a1a1aa": "--color-gray-400",
  "#71717a": "--color-gray-500",
  "#52525b": "--color-gray-600",
  "#3f3f46": "--color-gray-700",
  "#27272a": "--color-gray-800",
  "#1f1f23": "--color-gray-850",
  "#18181b": "--color-gray-900",
  "#09090b": "--color-gray-950",
  "#fb923c": "--color-orange-400",
  "#f97316": "--color-orange-500",
  "#ea580c": "--color-orange-600",
  "#ef4444": "--status-error",
  "#dc2626": "--color-red-600",
  "#facc15": "--color-yellow-400",
  "#eab308": "--color-yellow-500",
  "#3b82f6": "--status-info",
  "#2563eb": "--color-blue-600",
  "#22c55e": "--status-success",
  "#16a34a": "--color-green-600",
  "#f59e0b": "--status-warning",
  "#dcfce7": "--status-success-bg",
  "#fef3c7": "--status-warning-bg",
  "#fee2e2": "--status-error-bg",
  "#dbeafe": "--status-info-bg",
};

const OPACITY_MAP = {
  "0.5": "--opacity-disabled",
  "0.6": "--opacity-muted",
  "0.7": "--opacity-active",
  "0.8": "--opacity-hover",
  "0.9": "--opacity-subtle",
};

const Z_INDEX_MAP = {
  "1": ["--z-above"],
  "50": ["--z-dropdown"],
  "100": ["--z-header"],
  "200": ["--z-overlay"],
  "201": ["--z-modal"],
  "1000": ["--z-banner"],
  "9999": ["--z-progress"],
};

// ============================================================================
// Patterns to check
// ============================================================================

/**
 * Each rule: { pattern, severity, suggest, skipIf }
 *   severity: 'error' | 'warning'
 *   suggest: function(match) → string suggestion
 *   skipIf: function(line, match, matchIndex) → boolean (skip this match)
 */
const RULES = [
  // ---- ERRORS: Must use tokens ----
  {
    name: "hardcoded-hex-color",
    // Match hex colors NOT inside var() fallbacks, NOT in comments, NOT in data URIs
    pattern: /(?<![\w-])#([0-9a-fA-F]{3,8})(?![0-9a-fA-F])/g,
    severity: "error",
    suggest(match) {
      const lower = match.toLowerCase();
      if (!COLOR_HEX_MAP[lower]) return "use a semantic color token";
      const token = COLOR_HEX_MAP[lower];
      if (token.startsWith("--status-") || token.startsWith("--surface-") || token.startsWith("--text-") || token.startsWith("--border-") || token.startsWith("--interactive-")) {
        return `use var(${token})`;
      }
      return `use a semantic token (Layer 2) — primitive: ${token}`;
    },
    skipIf(line, match, matchIndex) {
      // Skip if inside a var() fallback: var(--something, #hex)
      if (/var\([^)]*$/.test(line.slice(0, matchIndex))) return true;
      // Skip if in a CSS custom property definition (token file would be excluded anyway)
      if (/^\s*--[\w-]+\s*:/.test(line)) return true;
      // Skip if in a data URI (check that the match is actually inside the url())
      const urlStart = line.lastIndexOf("url(", matchIndex);
      if (urlStart !== -1 && !line.slice(urlStart, matchIndex).includes(")")) return true;
      // Skip if in a comment (line-start or inline)
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
  },
  {
    name: "hardcoded-rgb-color",
    pattern:
      /rgba?\(\s*\d+[\s,]+\d+[\s,]+\d+(?:[\s,/]+[\d.]+%?)?\s*\)/g,
    severity: "error",
    suggest() {
      return "use a semantic color token or overlay token";
    },
    skipIf(line, match, matchIndex) {
      if (/^\s*--[\w-]+\s*:/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      // Skip if inside a var() fallback
      if (matchIndex > 0 && /var\([^)]*$/.test(line.slice(0, matchIndex)))
        return true;
      return false;
    },
  },
  {
    name: "hardcoded-opacity",
    pattern: /opacity\s*:\s*(0?\.\d+)/g,
    severity: "error",
    suggest(match) {
      const val = match.match(/(0?\.\d+)/)?.[1];
      return OPACITY_MAP[val]
        ? `var(${OPACITY_MAP[val]})`
        : "define an opacity token";
    },
    skipIf(line, match, matchIndex) {
      if (/opacity\s*:\s*var\(/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
    checkContext: true,
  },
  {
    name: "hardcoded-z-index",
    pattern: /z-index\s*:\s*(\d+)/g,
    severity: "error",
    suggest(match) {
      const val = match.match(/(\d+)/)?.[1];
      const tokens = Z_INDEX_MAP[val];
      if (!tokens) return "define a z-index token";
      return tokens.length === 1
        ? `var(${tokens[0]})`
        : `var(${tokens.join(") or var(")})`;
    },
    skipIf(line, match, matchIndex) {
      if (/z-index\s*:\s*var\(/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
  },
  {
    name: "hardcoded-font-size",
    pattern:
      /font-size\s*:\s*([\d.]+(?:px|rem|em))(?!\s*!important)/g,
    severity: "error",
    suggest() {
      return "use a --font-size-* token";
    },
    skipIf(line, match, matchIndex) {
      if (/font-size\s*:\s*var\(/.test(line)) return true;
      if (/^\s*--[\w-]+\s*:/.test(line)) return true;
      if (/16px\s*!important/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
  },
  {
    name: "hardcoded-font-weight",
    pattern: /font-weight\s*:\s*(\d{3})/g,
    severity: "error",
    suggest() {
      return "use a --font-weight-* token";
    },
    skipIf(line, match, matchIndex) {
      if (/font-weight\s*:\s*var\(/.test(line)) return true;
      if (/^\s*--[\w-]+\s*:/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
  },
  {
    name: "hardcoded-border-radius",
    pattern: /border-radius\s*:\s*([\d.]+(?:px|rem))/g,
    severity: "error",
    suggest() {
      return "use a --radius-* token";
    },
    skipIf(line, match, matchIndex) {
      if (/border-radius\s*:\s*var\(/.test(line)) return true;
      if (/^\s*--[\w-]+\s*:/.test(line)) return true;
      if (/border-radius\s*:\s*50%/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
  },
  {
    name: "hardcoded-box-shadow",
    pattern: /box-shadow\s*:\s*(?!var\(|none|inherit|initial|unset)([^;]+)/g,
    severity: "error",
    suggest() {
      return "use a --shadow-* token";
    },
    skipIf(line, match, matchIndex) {
      if (/box-shadow\s*:\s*var\(/.test(line)) return true;
      if (/^\s*--[\w-]+\s*:/.test(line)) return true;
      if (/box-shadow\s*:\s*none/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
  },

  // ---- WARNINGS: Should ideally use tokens ----
  {
    name: "raw-px-spacing",
    // Match padding/margin/gap with raw px values (not inside var() or calc())
    pattern:
      /(?:padding|margin|gap)\s*:\s*(?!var\()(?!0(?:\s|;|$))([^;]*\d+px[^;]*)/g,
    severity: "warning",
    suggest() {
      return "consider using --space-* tokens";
    },
    skipIf(line, match, matchIndex) {
      if (/^\s*--[\w-]+\s*:/.test(line)) return true;
      if (/(?:padding|margin|gap)\s*:\s*var\(/.test(line)) return true;
      if (/(?:padding|margin|gap)\s*:\s*calc\(/.test(line)) return true;
      if (/env\(/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
  },
  {
    name: "raw-transition-duration",
    // Match raw durations in transition/animation not using var()
    pattern: /(?:transition|animation)(?:-duration)?\s*:\s*[^;]*?(\d+(?:\.\d+)?m?s)/g,
    severity: "warning",
    suggest() {
      return "consider using --duration-* or --transition-* tokens";
    },
    skipIf(line, match, matchIndex) {
      if (/var\(--(?:transition|duration|ease)/.test(line)) return true;
      if (/^\s*--[\w-]+\s*:/.test(line)) return true;
      if (/(?:transition|animation)[^:]*:\s*[^;]*\b0m?s\b/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
  },
  {
    name: "hardcoded-letter-spacing",
    pattern: /letter-spacing\s*:\s*(-?[\d.]+(?:em|rem|px))/g,
    severity: "warning",
    suggest() {
      return "use a --letter-spacing-* token";
    },
    skipIf(line, match, matchIndex) {
      if (/letter-spacing\s*:\s*var\(/.test(line)) return true;
      if (/^\s*--[\w-]+\s*:/.test(line)) return true;
      if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return true;
      if (isInsideInlineComment(line, matchIndex)) return true;
      return false;
    },
  },
];

// ============================================================================
// Scanner
// ============================================================================

function findCSSFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      results.push(...findCSSFiles(fullPath));
    } else if (entry.isFile() && /\.css$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function isInsideInlineComment(line, matchIndex) {
  // Check if matchIndex falls after a /* with no closing */ before it
  const before = line.slice(0, matchIndex);
  const lastOpen = before.lastIndexOf("/*");
  if (lastOpen === -1) return false;
  const lastClose = before.lastIndexOf("*/");
  return lastClose < lastOpen;
}

function isInsideKeyframes(lines, lineIndex) {
  // Walk backwards tracking brace depth to determine if lineIndex is inside @keyframes
  let braceDepth = 0;
  for (let i = lineIndex; i >= 0; i--) {
    const line = lines[i];
    const closeBraces = (line.match(/\}/g) || []).length;
    const openBraces = (line.match(/\{/g) || []).length;
    braceDepth += closeBraces - openBraces;
    // When braceDepth goes negative, we've found an enclosing block opener.
    // Check if that opener is a @keyframes declaration.
    if (braceDepth < 0) {
      return /@keyframes/.test(line);
    }
  }
  return false;
}

function scanFile(filePath) {
  const violations = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.includes("token-audit-disable-line")) continue;

    for (const rule of RULES) {
      // Reset regex state
      rule.pattern.lastIndex = 0;
      let match;

      while ((match = rule.pattern.exec(line)) !== null) {
        // Check skip conditions
        if (rule.skipIf && rule.skipIf(line, match[0], match.index)) continue;

        // Skip values inside @keyframes
        if (
          rule.name === "hardcoded-opacity" ||
          rule.name === "raw-transition-duration"
        ) {
          if (isInsideKeyframes(lines, i)) continue;
        }

        violations.push({
          file: filePath,
          line: lineNum,
          column: match.index + 1,
          rule: rule.name,
          severity: rule.severity,
          value: match[0].trim(),
          suggestion: rule.suggest(match[0]),
        });
      }
    }
  }

  return violations;
}

// ============================================================================
// Reporter
// ============================================================================

function formatViolation(v) {
  const relPath = path.relative(process.cwd(), v.file);
  const icon = v.severity === "error" ? "\x1b[31m✗\x1b[0m" : "\x1b[33m⚠\x1b[0m";
  const sevLabel =
    v.severity === "error"
      ? "\x1b[31merror\x1b[0m"
      : "\x1b[33mwarning\x1b[0m";
  return `  ${icon} ${relPath}:${v.line}:${v.column} ${sevLabel} [${v.rule}]\n    Found: ${v.value}\n    Suggestion: ${v.suggestion}`;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const cssFiles = findCSSFiles(SRC_DIR).filter(
    (f) => !TOKEN_FILES.has(path.resolve(f))
  );

  let allViolations = [];

  for (const file of cssFiles) {
    const violations = scanFile(file);
    allViolations.push(...violations);
  }

  const errors = allViolations.filter((v) => v.severity === "error");
  const warnings = allViolations.filter((v) => v.severity === "warning");

  if (allViolations.length === 0) {
    console.log("\x1b[32m✓ Token audit passed — zero violations found.\x1b[0m");
    console.log(`  Scanned ${cssFiles.length} CSS files.`);
    process.exit(0);
  }

  console.log("\n\x1b[1mToken Audit Report\x1b[0m\n");
  console.log(`Scanned ${cssFiles.length} CSS files.\n`);

  if (errors.length > 0) {
    console.log(
      `\x1b[31m${errors.length} error(s)\x1b[0m — hardcoded values that must use tokens:`
    );
    for (const v of errors) {
      console.log(formatViolation(v));
    }
    console.log();
  }

  if (warnings.length > 0) {
    console.log(
      `\x1b[33m${warnings.length} warning(s)\x1b[0m — values that should ideally use tokens:`
    );
    for (const v of warnings) {
      console.log(formatViolation(v));
    }
    console.log();
  }

  console.log(
    `\x1b[1mTotal: ${errors.length} errors, ${warnings.length} warnings\x1b[0m`
  );

  // Exit 1 only for errors, not warnings
  process.exit(errors.length > 0 ? 1 : 0);
}

main();

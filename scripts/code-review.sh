#!/bin/bash
# Code Review Script
# Checks for common AI coding pitfalls and quality issues

set -e

echo "Running code quality checks..."
echo ""

ERRORS=0

# Check for placeholder comments
echo "Checking for placeholder comments (TODO, FIXME, PLACEHOLDER)..."
if grep -rn --include="*.ts" --include="*.tsx" -E "(TODO|FIXME|PLACEHOLDER|HACK|XXX)" src/; then
  echo "  WARNING: Found placeholder comments that should be addressed"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No placeholder comments found"
fi
echo ""

# Check for console.log statements
echo "Checking for console.log statements..."
if grep -rn --include="*.ts" --include="*.tsx" "console\.log" src/ --exclude="*.test.*"; then
  echo "  WARNING: Found console.log statements (remove before production)"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No console.log statements found"
fi
echo ""

# Check for hardcoded localhost URLs
echo "Checking for hardcoded localhost URLs..."
if grep -rn --include="*.ts" --include="*.tsx" -E "localhost:[0-9]+" src/; then
  echo "  WARNING: Found hardcoded localhost URLs"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No hardcoded localhost URLs found"
fi
echo ""

# Check for 'any' type usage
echo "Checking for 'any' type usage..."
ANY_COUNT=$(grep -rn --include="*.ts" --include="*.tsx" ": any" src/ | wc -l || echo "0")
if [ "$ANY_COUNT" -gt 0 ]; then
  echo "  WARNING: Found $ANY_COUNT uses of 'any' type - consider using specific types"
  grep -rn --include="*.ts" --include="*.tsx" ": any" src/ || true
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No 'any' type usage found"
fi
echo ""

# Check for empty catch blocks
echo "Checking for empty catch blocks..."
if grep -rn --include="*.ts" --include="*.tsx" -A 1 "catch.*{" src/ | grep -E "^\s*}$"; then
  echo "  WARNING: Found potentially empty catch blocks"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No empty catch blocks found"
fi
echo ""

# Check for hardcoded API keys/secrets
echo "Checking for potential hardcoded secrets..."
if grep -rn --include="*.ts" --include="*.tsx" -E "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]+['\"]" src/ --ignore-case | grep -v "process.env" | grep -v ".example"; then
  echo "  WARNING: Potential hardcoded secrets found!"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: No obvious hardcoded secrets found"
fi
echo ""

# Run TypeScript type checking
echo "Running TypeScript type check..."
if npm run typecheck 2>&1; then
  echo "  OK: TypeScript compilation successful"
else
  echo "  ERROR: TypeScript errors found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Run ESLint
echo "Running ESLint..."
if npm run lint 2>&1; then
  echo "  OK: No linting errors"
else
  echo "  ERROR: Linting errors found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "================================"
if [ $ERRORS -gt 0 ]; then
  echo "Code review found $ERRORS issue(s) to address"
  exit 1
else
  echo "Code review passed! No issues found."
  exit 0
fi

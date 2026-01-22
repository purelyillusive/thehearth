# NOTES - Agent Scratchpad

> Working memory and observations. The agent updates this as it works.

## Codebase Patterns
<!-- Reusable patterns discovered - READ THIS FIRST each iteration -->

### Security Implementation Patterns
1. **Rate Limiting Pattern**: Generic `checkActionRateLimit(socketId, action, maxActions, window)` function
   - Used for chat messages (5 per 10s), location changes (5 per 60s), timezone changes (5 per 60s)
   - Cleanup in periodic interval and disconnect handler

2. **Input Validation Pattern**: Validate BEFORE processing
   - Type checking first
   - Length limits second  
   - Value range/whitelist third
   - Return early with error on failure

3. **CORS Configuration**: `parseAllowedOrigins()` function validates env var
   - Checks for null/undefined
   - Filters wildcards and empty strings
   - Validates URL format (http/https only)
   - Falls back to safe defaults

4. **DOMPurify Sanitization**: Server-side HTML stripping
   - ALLOWED_TAGS: [] (no tags)
   - ALLOWED_ATTR: [] (no attributes)
   - KEEP_CONTENT: true (preserve text)

## Current Observations

### Security Fixes Completed
- All CRITICAL vulnerabilities addressed (XSS, event injection, DoS)
- All HIGH severity issues resolved (rate limiting, CORS, CSP, validation)
- Server tested and functional
- One commit contains all fixes (already in git history)

### Bug Fixed
- `parseAllowedOrigins()` was using optional chaining incorrectly
- Fixed by adding early return when env is null/undefined
- Prevents TypeError when ALLOWED_ORIGINS not set

### PowerShell Compatibility
- Must use semicolon (`;`) instead of `&&` for command chaining
- Alternative: separate commands or use `-and` in conditionals

## Questions / Blockers

None - all security fixes complete and tested.

---
*Updated: 2026-01-22 (Iteration 6)*

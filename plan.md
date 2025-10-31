# Todo App Migration Plan

## Overview
Transform the Adobe I/O Runtime-based todo application into a standalone local application that runs without Adobe credentials, resolving dependency version drift, and improving test coverage.

## Current State Analysis

### Dependencies
- **Outdated**: React 17.0.1 → 18.3.1 (wanted) → 19.2.0 (latest)
- **Outdated**: React Spectrum 3.6.0 → 3.45.0 (wanted)
- **Outdated**: UUID 8.3.1 → 10.0.0 (wanted) → 13.0.0 (latest)
- **Missing**: Express, CORS (not installed)
- **Outdated**: React Error Boundary 1.2.5 → 4.1.2 (wanted) → 6.0.0 (latest)
- **Outdated**: Jest 24.9.0 → 29.7.0 (wanted) → 30.2.0 (latest)

### Adobe I/O Dependencies to Remove
- `@adobe/exc-app` - Adobe Experience Cloud Runtime
- `@adobe/aio-sdk` - Adobe I/O SDK
- `@adobe/aio-lib-state` - State library
- Adobe authentication headers/tokens

### Current Architecture Issues
1. Frontend depends on Adobe I/O Runtime for API calls
2. Backend actions require `require-adobe-auth` annotation
3. State storage uses Adobe I/O lib-state
4. Authentication hardcoded to use Adobe IMS
5. Tests mock Adobe I/O dependencies

### Already Completed
- ✅ Basic Express server created (`server.js`)
- ✅ File-based storage implementation for todos
- ✅ Frontend config updated to use localhost API
- ✅ `bootstrapRaw()` fallback mode in index.js

## Migration Plan - Iterative Phases

### Phase 1: Remove Adobe Dependencies & Update Config ⭐ Foundation
**Goal**: Clean up dependencies and configuration
**Files**: `package.json`, `web-src/src/index.js`, `web-src/src/components/App.js`

**Tasks**:
1. ✅ Remove Adobe I/O packages from dependencies
2. ✅ Update `index.js` to always use `bootstrapRaw()` mode
3. ✅ Remove `@adobe/exc-app` import and related code
4. ✅ Update `App.js` to work without `ims` object
5. ✅ Remove authentication headers from API calls
6. ✅ Update `package.json` to use wanted versions
7. ✅ Install missing dependencies (express, cors)

**Test**: ✅ `npm start` should run without errors

**Commit**: ✅ `refactor: remove Adobe I/O dependencies and auth requirements`

---

### Phase 2: Upgrade Dependencies Safely ⭐ Stability
**Goal**: Resolve all version drift without breaking changes
**Files**: `package.json`

**Tasks**:
1. ✅ Upgrade React 17 → 18.3.1 (wanted) - breaking changes possible
2. ✅ Upgrade React DOM 17 → 18.3.1 (wanted)
3. ✅ Update `@adobe/react-spectrum` 3.6.0 → 3.45.0 (wanted)
4. ✅ Upgrade UUID 8.3.1 → 10.0.0 (wanted) - breaking changes
5. ✅ Upgrade React Error Boundary 1.2.5 → 4.1.2 (wanted)
6. ✅ Upgrade Jest 24.9.0 → 29.7.0 (wanted)
7. ✅ Upgrade @spectrum-icons/workflow 3.2.0 → 4.0.0 (React 18 compatibility)
8. ✅ Update esbuild JSX mode to automatic for React 18
9. ✅ Temporarily disable legacy Adobe I/O tests (to be rewritten in Phase 4)
10. ✅ Run full test suite to verify compatibility

**Resolved Issues**:
- React 17 → 18: Updated to JSX automatic transform in esbuild
- UUID v8 → v10: No import changes needed
- React Error Boundary API: Compatible version installed
- Spectrum Icons: Upgraded to v4 for React 18 compatibility

**Test**: ✅ All tests pass (legacy tests skipped)

**Commit**: ✅ `chore: upgrade dependencies to resolve version drift`

---

### Phase 3: Simplify Frontend Architecture ⭐ UX
**Goal**: Remove Adobe-specific code paths
**Files**: `web-src/src/index.js`, `web-src/src/components/App.js`, `web-src/src/exc-runtime.js`

**Tasks**:
1. ✅ Remove `exc-runtime.js` file entirely
2. ✅ Simplify `index.js` to always bootstrap raw mode
3. ✅ Update `App.js` to remove IMS profile dependencies
4. ✅ Improve ErrorBoundary fallback component
5. ✅ Clean up prop validation (removed PropTypes import)
6. ✅ Add React import to `index.js` for proper JSX handling
7. ✅ Add CSS bundle link to `index.html` for React Spectrum styling
8. ✅ Create build script for cleaner build process

**Test**: ✅ UI renders and functions correctly with proper React Spectrum styling

**Commit**: ✅ `refactor: simplify frontend architecture by removing Adobe-specific code`

---

### Phase 4: Business Logic Unit Tests ⭐ Quality
**Goal**: Add comprehensive unit tests for core business logic
**Files**: `test/actions/todolist.test.js`, new test files

**Tasks**:
1. Rewrite `test/actions/todolist.test.js` to test local Express API
2. Create business logic tests:
   - `test/server/api.test.js` - API endpoint tests
   - `test/server/storage.test.js` - Storage layer tests
3. Test CRUD operations independently
4. Test edge cases (max todos, duplicate lists, missing params)
5. Achieve >80% coverage on business logic

**Test**: `npm test` runs all unit tests

**Commit**: `test: add comprehensive unit tests for business logic`

---

### Phase 5: E2E Tests for Core User Journeys ⭐ Integration
**Goal**: Validate complete user workflows
**Files**: `e2e/actions/todolist.e2e.js`, new e2e files

**Tasks**:
1. Rewrite existing e2e tests for local server
2. Add new e2e tests:
   - Creating a todo list
   - Adding todos to a list
   - Marking todos complete/incomplete
   - Deleting todos
   - Deleting entire todo lists
   - Max todos limit enforcement
3. Use Playwright or similar for browser automation
4. Test error handling and edge cases

**Test**: `npm run e2e` runs end-to-end tests

**Commit**: `test: add e2e tests for core user journeys`

---

### Phase 6: Documentation & Cleanup ⭐ Polish
**Goal**: Update documentation and clean up unused files
**Files**: `README.md`, `app.config.yaml`, unused files

**Tasks**:
1. Rewrite `README.md` for local development
2. Remove or deprecate `app.config.yaml` (Adobe-specific)
3. Remove unused Adobe I/O action files if not needed
4. Add getting started guide
5. Document API endpoints
6. Add environment configuration guide
7. Clean up `.gitignore`

**Test**: Documentation is clear and accurate

**Commit**: `docs: update documentation for local development`

---

### Phase 7: Optional Enhancements 🎯 Bonus
**Goal**: Improve developer experience
**Files**: Various

**Tasks**:
1. Add hot module reloading for development
2. Add environment variables for configuration
3. Consider adding Docker support
4. Add pre-commit hooks for linting/testing
5. Add CI/CD configuration (GitHub Actions)
6. Consider TypeScript migration

**Test**: Enhanced features work as expected

**Commit**: `feat: add development enhancements`

---

## Success Criteria

### Must Have ✅
- [✅] App runs locally without Adobe credentials
- [ ] App displays correctly on localhost
- [ ] All dependencies up to date (wanted versions)
- [ ] Unit tests for business logic (>80% coverage)
- [ ] E2E tests for core user journeys
- [ ] All tests passing
- [ ] No linter errors

### Nice to Have 🎯
- [ ] TypeScript conversion
- [ ] Docker support
- [ ] CI/CD pipeline
- [ ] Enhanced developer tooling
- [ ] Performance optimizations

---

## Risk Mitigation

### High Risk Areas
1. **React 17 → 18 upgrade**: Breaking changes in component lifecycle
   - *Mitigation*: Update component code incrementally, extensive testing

2. **UUID version changes**: Import syntax changes
   - *Mitigation*: Search codebase for all UUID usage, update imports

3. **Test framework changes**: Jest API changes
   - *Mitigation*: Review Jest migration guide, update test syntax

4. **Adobe Spectrum CSS compatibility**: Theme/component changes
   - *Mitigation*: Test UI thoroughly, review Spectrum documentation

---

## Execution Strategy

1. ✅ **Create feature branch**: `refactor/remove-adobe-dependencies`
2. **Follow phases sequentially**: Each phase is a logical checkpoint
3. **Commit frequently**: Descriptive commits at each phase completion
4. **Test continuously**: Run tests after each significant change
5. **Handle conflicts early**: Address version conflicts as they appear
6. **Document blockers**: Track any unexpected issues
7. **Final review**: Code review before merge to main

---

## Timeline Estimate

- **Phase 1**: 1-2 hours
- **Phase 2**: 2-3 hours
- **Phase 3**: 1-2 hours
- **Phase 4**: 3-4 hours
- **Phase 5**: 3-4 hours
- **Phase 6**: 1-2 hours
- **Phase 7**: Optional, 4+ hours

**Total**: ~12-18 hours of focused work

---

## Notes

- Start with Phase 1 as it's the foundation
- Don't skip phases - each builds on the previous
- Keep main branch stable - all work on feature branch
- Test thoroughly before committing each phase
- Ask for help if stuck >30 minutes on a task


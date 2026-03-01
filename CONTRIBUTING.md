# Contributing to WSP Finance

## Branch Strategy

- main → production-ready
- develop → integration branch
- feature/* → new features
- fix/* → bug fixes
- hotfix/* → urgent fixes

All changes must be submitted via Pull Request.

---

## Commit Convention

We follow Conventional Commits:

- feat
- fix
- refactor
- test
- ci
- chore
- docs
- security

Example:
feat(auth): implement OAuth2 login

---

## Pull Request Rules

- CI must pass
- SonarCloud Quality Gate must pass
- Code must be up to date with develop
- All discussions must be resolved

---

## Code Quality

- TypeScript strict mode enabled
- No any without justification
- Minimum test coverage required
- No console.log in production code
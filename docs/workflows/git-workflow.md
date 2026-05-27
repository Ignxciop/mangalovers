# Git Workflow

## Branch rule
Each change creates its own branch from `main`. Never work directly on `main`.

One branch per change. If current branch is `fix/logout` and an unrelated task appears, create a new branch from `main`.

## Branch naming

| Type | Prefix | Example |
|------|--------|---------|
| Feature | `feat/` | `feat/dark-mode` |
| Bugfix | `fix/` | `fix/error-lectura` |
| Refactor | `refactor/` | `refactor/auth-service` |
| CI/CD | `ci/` | `ci/workers` |

## Flow

```
main
  └── feat/mi-cambio  →  PR  →  staging  (CI)
                                  ↓
                            ⏳ 10 min (estabilidad)
                                  ↓
                            PR automático  →  main  (CI)
                                  ↓
                            Merge manual
```

1. Create branch from `main`: `git switch -c feat/mi-cambio`
2. Work, commit, push: `git push -u origin feat/mi-cambio`
3. Open PR from `feat/mi-cambio` → `staging` on GitHub
4. Wait for CI to pass, merge
5. `Promote staging` workflow waits 10 min without changes, auto-creates PR to `main`
6. Review and merge PR to `main`
7. Delete branch locally and remote: `git branch -d feat/mi-cambio`

## Protection
- `main` and `staging` are protected: PR required with green CI, direct push blocked.

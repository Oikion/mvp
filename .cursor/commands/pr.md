Create a pull request for the current changes.

1. Run `git status` to see all changed files
2. Run `git diff` to review the actual changes
3. Check if there are unstaged changes that should be included
4. Write a clear commit message following Conventional Commits format (`feat:`, `fix:`, `refactor:`, etc.)
5. Stage relevant files with `git add` (exclude `.env`, `.env.local`, debug logs)
6. Commit with the message
7. Push to the current branch with `git push -u origin HEAD`
8. Use `gh pr create` to open a pull request with:
   - A descriptive title matching the commit convention
   - A body with: ## Summary (bullet points of changes), ## Test Plan (how to verify)
9. Return the PR URL when done

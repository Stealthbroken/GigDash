# GigDash Migration Guide: From Replit to Team GitHub Development

> **New:** For day-to-day teamwork, prettier VS Code docs, and vibe coding, start at **[docs/README.md](./README.md)** — especially [GitHub Collaboration](./github-collaboration.md) and [Getting Started](./getting-started.md). This file keeps the original step-by-step migration checklist.

## Overview

This guide covers everything you need to move GigDash from solo development on Replit to team-based collaborative work on GitHub. It assumes most team members are new to Git/GitHub.

---

## Part 1: Migration Steps (The Setup)

### Step 1: Create the GitHub Repository

1. One person (the "repo owner") goes to [github.com/new](https://github.com/new)
2. Name the repo `gigdash` (or similar)
3. Make it **private** (you're a school project, but you might want this public later)
4. Do **NOT** initialize with a README, .gitignore, or license (we already have our own)

### Step 2: Export Code from Replit

On the Replit project, check the Git status to see what's already committed:
```bash
git status
```

The repo should already be under Git. Create a GitHub remote and push:
```bash
# Add the GitHub repo as a remote
git remote add origin https://github.com/YOUR_USERNAME/gigdash.git

# Push everything to GitHub
git push -u origin main
```

**Note:** The `pnpm-workspace` setup, all artifacts, and the existing code are all tracked in Git already. Push should be straightforward.

### Step 3: Configure GitHub for the Team

**Protect the main branch:**
1. Go to repo Settings > Branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Check: **Require a pull request before merging**
5. Check: **Require approvals** (set to 1 or 2)
6. Save

**Add team members:**
1. Settings > Access > Collaborators
2. Add each team member by their GitHub username
3. They'll get an email invite

### Step 4: Set Up Local Development

Each team member needs:
1. **Node.js** (v24+ recommended — check `.nvmrc` if one exists)
2. **pnpm** (install via `npm install -g pnpm`)
3. **Git** (install from [git-scm.com](https://git-scm.com))

Clone the repo:
```bash
git clone https://github.com/YOUR_USERNAME/gigdash.git
cd gigdash
```

Install dependencies:
```bash
pnpm install
```

### Step 5: Set Up a Shared Cloud Database (Neon — Free)

You don't need a local database. Everyone on the team connects to one **shared cloud PostgreSQL database** that runs 24/7. This is the easiest way to work.

**Recommended provider: Neon** ([neon.tech](https://neon.tech))
- Free tier: 10GB storage, 500MB RAM, 1000 compute hours/month
- Serverless — sleeps when idle, wakes up instantly on query
- No credit card required

**How to set it up (one person does this):**
1. Go to [neon.tech](https://neon.tech) and sign up (free, use GitHub login)
2. Create a new project — name it `gigdash`
3. Neon gives you a connection string like:
   `postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/gigdash?sslmode=require`
4. Copy that string
5. In the Replit project, add it as a secret:
   - Replit sidebar > Secrets (lock icon) > Add new
   - Key: `DATABASE_URL` | Value: the Neon connection string
6. In GitHub repo Settings > Secrets and variables > Actions > New repository secret:
   - Name: `DATABASE_URL` | Value: the Neon connection string
7. Push the schema to Neon:
   ```bash
   pnpm --filter @workspace/db run push
   ```
8. Seed the database:
   ```bash
   pnpm --filter @workspace/scripts run seed
   ```

**How each team member uses it:**
1. Clone the repo locally
2. Copy `.env.example` to `.env`
3. Paste the same `DATABASE_URL` into `.env`
4. Run `pnpm install`
5. `pnpm --filter @workspace/api-server run dev` — the server connects to the cloud DB
6. `pnpm --filter @workspace/gigdash run dev` — frontend talks to your local API, which talks to Neon

**Why this is better than local PostgreSQL:**
- No `brew install postgresql`, no Docker, no `pg_ctl`
- Everyone sees the same data (events, venues, users) in real time
- The database stays alive when you close your laptop
- Your teacher can see the live data by visiting the deployed app

**What about the SESSION_SECRET?**
- Each developer can use a different random string locally (it's only for cookie signing)
- For the deployed app, use a single secret in Replit/GH Actions
- Generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Step 6: Replit GitHub Integration

On Replit, connect to the GitHub repo:
1. Replit sidebar > Git (branch icon)
2. Connect to GitHub remote
3. Now you can push/pull from the Replit UI

---

## Part 2: Team Guide — How to Work Together

### The Golden Rule

**Never commit directly to `main`.** Always create a branch, open a Pull Request, and get someone else to review it before merging.

---

### Git Vocabulary (One-Minute Cheat Sheet)

| Term | What It Means | Real-World Analogy |
|------|---------------|-------------------|
| **Repository (repo)** | The project folder with all its history | A shared Google Drive folder |
| **Branch** | A parallel copy of the code for working on one feature | Making a copy of a document before editing |
| **Commit** | A snapshot of your changes with a message | Saving a version of your document |
| **Push** | Upload your commits to GitHub | Syncing your Google Drive |
| **Pull** | Download the latest changes from GitHub | Syncing your Google Drive from the cloud |
| **Pull Request (PR)** | A request to merge your branch into main | Asking a teacher to review your essay before submitting |
| **Merge** | Combining your branch into main | Turning in your final essay |
| **Conflict** | When two people changed the same line | Two people edited the same slide in a presentation |

---

### Your Daily Workflow

#### 1. Start Your Work Day

```bash
# Make sure you're on the main branch
git checkout main

# Get the latest changes from teammates
git pull origin main

# Install any new dependencies teammates added
pnpm install
```

#### 2. Create a Feature Branch

Name your branch after what you're working on:

```bash
git checkout -b add-venue-rating
# or
git checkout -b fix-map-marker-crash
# or
git checkout -b update-fan-homepage
```

**Naming convention:** `add-` or `update-` for features, `fix-` for bugs.

#### 3. Make Your Changes

Edit code normally. Every time you finish a meaningful chunk:

```bash
# See what changed
git status

# Stage the files you want to commit
git add src/components/FanHome.tsx

# Or stage all changed files
git add .

# Commit with a clear message
git commit -m "Add venue rating stars to profile page"
```

**Commit message tips:**
- Write what you did in present tense: "Add..." not "Added..."
- Be specific: "Fix map marker crash on event select" not "fix stuff"

#### 4. Push Your Branch to GitHub

```bash
git push origin add-venue-rating
```

#### 5. Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/gigdash`
2. GitHub will show a banner: "Compare & pull request"
3. Click it
4. Fill in the title (same as your branch name, but readable)
5. Fill in the description:
   - What changed?
   - Why?
   - How to test it?
   - Screenshots (if UI changes)
6. Click "Create pull request"

#### 6. Review Someone Else's PR

When someone tags you in a review:
1. Click the PR
2. Read the description
3. Look at the "Files changed" tab
4. Add comments on specific lines if you have questions
5. Click "Review changes" > "Approve" (or "Request changes" if something's wrong)

#### 7. Merge Your Approved PR

Once someone approves:
1. Click the green "Merge pull request" button
2. Delete the branch (GitHub will offer a button)
3. Go back to your Replit workspace
4. `git checkout main` then `git pull origin main` to get your changes

---

### Replit-Specific Workflow

Since you're on Replit, the easiest path is:

1. Open the Replit workspace
2. In the Replit sidebar, click the **Git** icon
3. Create a new branch from there (no terminal commands needed)
4. Make your changes
5. In the Git panel, see your changes, stage them, and commit
6. Push the branch
7. Open the PR on GitHub
8. After merge, click "Pull" in the Replit Git panel to get the merged code

---

### Handling Conflicts (When Two People Edit the Same File)

**If a conflict happens when you try to pull:**

```bash
# You see something like:
# CONFLICT (content): Merge conflict in src/pages/FanHome.tsx

# Open the file. You'll see this:
<<<<<<< HEAD
  const [selectedGenre, setSelectedGenre] = useState("All");
=======
  const [selectedGenre, setSelectedGenre] = useState("Jazz");
>>>>>>> main

# Decide which version to keep (or combine them), then delete the markers:
  const [selectedGenre, setSelectedGenre] = useState("All");

# Save the file
git add src/pages/FanHome.tsx
git commit -m "Resolve merge conflict in FanHome"
```

**Pro tip:** If you're stuck on a conflict, ask the person who made the other changes. They can help you decide what's right.

---

### Team Rules (Agree on These Together)

1. **One PR per feature** — don't lump unrelated changes together
2. **Small PRs are better** — 100 lines changed > 1,000 lines changed
3. **Review within 24 hours** — don't let PRs sit
4. **Screenshots for UI changes** — so reviewers don't have to run the code
5. **Test before you PR** — run `pnpm run typecheck` at minimum
6. **Communicate** — if a branch is taking days, tell the team

---

### Emergency: Someone Broke Main

If a bad PR gets merged and the app crashes:

1. Identify the bad PR on GitHub
2. Click the PR > "Revert" button
3. This creates a new PR that undoes the bad one
4. Review and merge it
5. Everyone pulls the fix

**Or if you know who made the change, just ask them to fix it quickly.**

---

## Part 3: ICS4U-Specific Recommendations

### For Your Teacher (Documentation)

- Keep the GitHub PR history as a record of your development
- Tag releases with git tags: `git tag -a v1.0 -m "Final demo version"`
- The commit history itself is a story of your project

### For Your Team Meetings

- Open the GitHub project page at the start of class
- Review open PRs together
- Assign one person to be the "merger" each week
- Use GitHub Issues for task tracking (free, built-in)

### For Testing

- Each PR should include: `pnpm run typecheck` passes
- Before a major demo: `pnpm run build` passes
- The deployed Replit preview is your "staging" environment

---

## Quick Reference Card

```
DAILY:
  git checkout main
  git pull origin main
  git checkout -b my-feature

  (make changes)

  git add .
  git commit -m "What I did"
  git push origin my-feature

  (open PR on GitHub)
  (wait for review)
  (click Merge)

  git checkout main
  git pull origin main
```

---

## FAQ

**Q: Do I need to install anything on my laptop?**  
A: No. If you keep using Replit, everything stays in the browser. GitHub is just for the code review layer.

**Q: What if two people edit the same file?**  
A: Git will merge them automatically if you changed different lines. If you changed the same line, you get a conflict (see the section above).

**Q: Can I commit broken code?**  
A: Technically yes, but don't. Commit code that compiles and type-checks. `pnpm run typecheck` is your friend.

**Q: What if I forget to create a branch and commit to main?**  
A: Ask a teammate. They can help you revert the commit and move it to a branch.

**Q: How do I see what someone else is working on?**  
A: On GitHub, go to the repo > Pull Requests. All open branches are there.

---

*Good luck, team! The Git workflow is just a structured way to say "Hey, can you check my work before I share it with everyone?" That's all PRs are.*

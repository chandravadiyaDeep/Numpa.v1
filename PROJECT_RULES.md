# NUMPA — Project Rules & Development Guidelines

## 1. Project Source of Truth

The current NUMPA repository is the single source of truth.

Always inspect and reuse the existing project architecture before making changes.

Do not assume that a feature, system, component, API, or logic is missing without checking the repository first.

---

# 2. Core Rule: Change Only What Is Requested

Implement only the feature, integration, fix, or modification explicitly requested by the user.

Do not independently:

- Add extra features
- Remove existing features
- Redesign pages
- Change UI unnecessarily
- Refactor unrelated code
- Rename files or folders
- Reorganize the project
- Optimize unrelated systems
- Replace existing working logic

Make the smallest possible change required to complete the requested task.

---

# 3. Existing Architecture Must Be Preserved

Do not break or replace the existing NUMPA architecture.

Preserve existing:

- Frontend structure
- Routes
- Components
- UI design system
- State management
- Dataset flow
- Preprocessing pipeline
- Backend connections
- APIs
- Supabase configuration
- Authentication
- Database connections
- Existing feature integrations

Extend existing systems instead of creating replacements.

---

# 4. Never Create Duplicate Systems

Before creating a new system, check whether NUMPA already has an existing system that can be reused.

Do not create:

- Duplicate authentication systems
- Duplicate dataset storage
- Duplicate dataset upload flows
- Parallel state management
- Duplicate preprocessing engines
- Duplicate backend connections
- Duplicate APIs
- Duplicate feature implementations

The existing architecture should always be reused whenever possible.

---

# 5. Dataset Architecture Protection

The existing dataset flow is a critical part of NUMPA.

Do not break, replace, or duplicate the existing dataset architecture.

New data-related features should integrate with the existing dataset/state flow wherever possible.

Never silently modify:

- Original dataset
- Processed dataset
- Preprocessing pipeline
- Pipeline history
- Undo/redo behavior

New operations must not corrupt existing dataset state.

---

# 6. Authentication & Supabase Protection

Supabase authentication and existing backend/database connections are critical systems.

Do not modify them unless the current instruction explicitly requires it.

Preserve:

- Login
- Signup
- Google authentication
- Password reset
- Session handling
- Authentication guards
- User profiles
- Supabase configuration
- Database connections
- Existing RLS/security behavior

Never create a parallel authentication system.

---

# 7. UI & Design Protection

Do not redesign existing NUMPA pages unless explicitly requested.

When adding a feature:

- Follow the existing NUMPA UI style
- Reuse existing components
- Reuse the existing design system
- Maintain consistent spacing and layout
- Keep existing navigation intact
- Do not change unrelated pages

A new feature should feel like a natural part of NUMPA.

---

# 8. Feature Integration Rules

Every new feature must integrate with the existing project rather than exist as an isolated duplicate system.

Before implementation:

1. Identify relevant existing files.
2. Identify existing state and data flow.
3. Reuse existing components and utilities where possible.
4. Add only the minimum required files or code.
5. Preserve backward compatibility.

Do not rewrite working systems simply to implement a new feature.

---

# 9. Backend Rules

Do not create new backend infrastructure unless it is genuinely required by the requested feature.

Before creating:

- A new API
- A server
- A database table
- A backend service
- A storage system

First check whether the existing architecture can support the feature.

Any new backend system must remain isolated and must not interfere with existing Supabase/backend functionality.

---

# 10. File Modification Discipline

Modify only files directly related to the requested feature.

Do not:

- Rename unrelated files
- Move unrelated files
- Delete existing files
- Rewrite large parts of working files unnecessarily
- Change project configuration without need

Prefer small, targeted modifications.

---

# 11. Error Handling

New features must fail safely.

Do not allow errors in a new feature to crash:

- The dashboard
- Authentication
- Dataset loading
- Analysis
- Preprocessing
- Visualization
- ML Readiness
- ML Lab
- Export

Show clear user-facing errors when appropriate.

---

# 12. Backward Compatibility

Every change must preserve existing functionality.

After implementing a feature, ensure that existing connected systems continue working.

A new feature must not break existing workflows.

---

# 13. No Unrequested Improvements

Do not make changes because something:

- Looks better
- Seems cleaner
- Could be optimized
- Could be redesigned
- Could be refactored
- Could be modernized

Only make such changes when explicitly requested.

The goal is controlled development, not uncontrolled improvement.

---

# 14. Conflict Rule

If the requested implementation conflicts with:

- Existing architecture
- Existing logic
- Authentication
- Dataset flow
- Backend systems
- Existing functionality

Do not make destructive changes automatically.

Clearly explain the conflict and choose the safest integration approach.

---

# 15. Development Priority

Follow this priority order:

1. Protect existing functionality
2. Preserve architecture
3. Reuse existing systems
4. Implement the requested feature
5. Keep changes minimal
6. Maintain UI consistency
7. Verify direct integration

Never sacrifice project stability for unnecessary changes.

---

# 16. Testing Rule

After implementing a requested feature:

- Verify the new feature works.
- Verify its direct integrations work.
- Check that no directly connected existing functionality was broken.

Do not introduce unrelated changes during testing.

---

# 17. Final Development Principle

NUMPA is an evolving connected product.

Every new feature must strengthen the existing system.

The development philosophy is:

**INSPECT → UNDERSTAND → REUSE → INTEGRATE → TEST**

Never:

**ASSUME → REPLACE → DUPLICATE → REFACTOR EVERYTHING**

---

# STRICT FINAL RULE

Follow all rules in this `PROJECT_RULES.md` file for every development task.

The user's current integration instruction defines WHAT to build.

This file defines HOW it must be built safely.

If there is a conflict, prioritize:

1. Explicit user instruction
2. Project safety and preservation of working systems
3. Existing project architecture
4. Minimal and safe integration

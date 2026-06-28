---
name: TypeScript req.params cast
description: ts-node infers req.params values as string | string[] in some route patterns
---

## Rule
When passing `req.params.someId` to a function expecting `string`, use `String(userId)` or `req.params.userId as string`.

**Why:** This version of @types/express + ts-node infers params as `string | string[]` in certain route handler patterns, even though at runtime it's always `string`.

**How to apply:** Any time a req.params value is passed as an argument to a typed function — cast it.

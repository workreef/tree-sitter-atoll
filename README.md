# tree-sitter-atoll

Tree-sitter grammar for the [Atoll](https://github.com/workreef/atoll) language.

Used by the Zed extension at `code/dev/ide/zed/`. The grammar is intentionally
permissive — it's tuned for syntax highlighting, not semantic validation. The
real Atoll parser lives in `crates/atoll-syntax/`.

## Building

    bunx tree-sitter generate
    bunx tree-sitter test

## Coverage

v1 targets syntax highlighting:

- Declarations: `fn`, `struct`, `enum`, `type`, `distinct type`, `trait`,
  `impl`, `const`, `module`, `import`.
- Decorators (`@name`, `@name(args)`).
- `:=` / `mut :=` bindings, typed bindings (`name: T = expr`).
- Calls, method calls, member access, indexing, generic application `T[U]`.
- Match, if/else, for, return/break/continue/yield/defer.
- Concurrency keywords (`spawn`, `race`, `select`).
- Literals: int (dec/hex/bin/oct, optional underscores, optional type suffix),
  float, string with `$ident`/`${expr}` interpolation segments, char, byte,
  `true`/`false`, loop labels (`'name`).
- Comments: line, block, doc.

Out of scope (recovered as ERROR nodes):

- Full effect-row syntax in `using` clauses.
- Trailing-closure call syntax edge cases.
- Subjectless `match { cond => … }`.

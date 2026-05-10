; Atoll outline query for Zed's outline panel and the file picker
; symbol search.
;
; Captures:
;   @item    - the entire declaration to fold under
;   @name    - the symbol name shown in the outline
;   @context - keyword/qualifier prefix (fn, struct, etc.)
;
; Note: do NOT bind decorators as @annotation here — `(decorator)?`
; matches once per decorator child, producing duplicate outline
; entries for items with multiple decorators (e.g. `@host(...) @suspend`).

; ── Top-level declarations ────────────────────────────────────────

(function_declaration
  "fn" @context
  name: (identifier) @name) @item

(struct_declaration
  "struct" @context
  name: (type_identifier) @name) @item

(enum_declaration
  "enum" @context
  name: (type_identifier) @name) @item

(error_declaration
  "error" @context
  name: (type_identifier) @name) @item

(trait_declaration
  "trait" @context
  name: (type_identifier) @name) @item

(type_alias
  "type" @context
  name: (type_identifier) @name) @item

(distinct_type
  "distinct" @context
  "type" @context
  name: (type_identifier) @name) @item

(const_declaration
  "const" @context
  name: (identifier) @name) @item

(impl_block
  "impl" @context
  first: (_) @name) @item

(module_declaration
  "module" @context
  path: (module_path) @name) @item

; ── Members within enum bodies ───────────────────────────────────

(enum_variant
  name: (type_identifier) @name) @item

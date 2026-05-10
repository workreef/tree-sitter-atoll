; Atoll outline query for Zed's outline panel and the file picker
; symbol search.
;
; Captures:
;   @item       - the entire declaration to fold under
;   @name       - the symbol name shown in the outline
;   @context    - keyword/qualifier prefix (fn, struct, etc.)
;   @annotation - decorator name(s) preceding the item
;
; Notes:
; - `(decorator name: (decorator_path) @annotation)*` captures only
;   the decorator's path, dropping the leading `@` and any arguments,
;   so a fn with `@host("ns", "name") @suspend` shows clean names
;   in the outline rather than the full noisy decorator text.
; - The `*` quantifier (not `?`) is required: `?` matches once per
;   decorator child, producing duplicate outline entries for items
;   with multiple decorators.

; ── Top-level declarations ────────────────────────────────────────

(function_declaration
  (decorator name: (decorator_path) @annotation)*
  "fn" @context
  name: (identifier) @name) @item

(struct_declaration
  (decorator name: (decorator_path) @annotation)*
  "struct" @context
  name: (type_identifier) @name) @item

(enum_declaration
  (decorator name: (decorator_path) @annotation)*
  "enum" @context
  name: (type_identifier) @name) @item

(error_declaration
  (decorator name: (decorator_path) @annotation)*
  "error" @context
  name: (type_identifier) @name) @item

(trait_declaration
  (decorator name: (decorator_path) @annotation)*
  "trait" @context
  name: (type_identifier) @name) @item

(type_alias
  (decorator name: (decorator_path) @annotation)*
  "type" @context
  name: (type_identifier) @name) @item

(distinct_type
  (decorator name: (decorator_path) @annotation)*
  "distinct" @context
  "type" @context
  name: (type_identifier) @name) @item

(const_declaration
  (decorator name: (decorator_path) @annotation)*
  "const" @context
  name: (identifier) @name) @item

(impl_block
  (decorator name: (decorator_path) @annotation)*
  "impl" @context
  first: (_) @name) @item

(module_declaration
  "module" @context
  path: (module_path) @name) @item

; ── Members within enum bodies ───────────────────────────────────

(enum_variant
  (decorator name: (decorator_path) @annotation)*
  name: (type_identifier) @name) @item

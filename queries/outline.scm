; Atoll outline query for Zed's outline panel and the file picker
; symbol search.
;
; Captures:
;   @item       - the entire declaration to fold under
;   @name       - the symbol name shown in the outline
;   @context    - keyword/qualifier prefix (fn, struct, etc.)
;   @annotation - decorator(s) preceding the item
;
; Note: use `(decorator)*` (not `(decorator)?`). The `?` form matches
; once per individual decorator child, which produces duplicate
; outline entries for items with multiple decorators (e.g.
; `@host(...) @suspend`). The `*` form binds all decorator siblings
; into a single match.

; ── Top-level declarations ────────────────────────────────────────

(function_declaration
  (decorator)* @annotation
  "fn" @context
  name: (identifier) @name) @item

(struct_declaration
  (decorator)* @annotation
  "struct" @context
  name: (type_identifier) @name) @item

(enum_declaration
  (decorator)* @annotation
  "enum" @context
  name: (type_identifier) @name) @item

(error_declaration
  (decorator)* @annotation
  "error" @context
  name: (type_identifier) @name) @item

(trait_declaration
  (decorator)* @annotation
  "trait" @context
  name: (type_identifier) @name) @item

(type_alias
  (decorator)* @annotation
  "type" @context
  name: (type_identifier) @name) @item

(distinct_type
  (decorator)* @annotation
  "distinct" @context
  "type" @context
  name: (type_identifier) @name) @item

(const_declaration
  (decorator)* @annotation
  "const" @context
  name: (identifier) @name) @item

(impl_block
  (decorator)* @annotation
  "impl" @context
  first: (_) @name) @item

(module_declaration
  "module" @context
  path: (module_path) @name) @item

; ── Members within enum bodies ───────────────────────────────────

(enum_variant
  (decorator)* @annotation
  name: (type_identifier) @name) @item

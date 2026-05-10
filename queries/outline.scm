; Atoll outline query for Zed's outline panel and the file picker
; symbol search.
;
; Captures:
;   @item    - the entire declaration to fold under
;   @name    - the symbol name shown in the outline
;   @context - keyword/qualifier prefix (fn, struct, etc.)
;
; Annotation styling: `@annotation` gets dim/italic styling for
; decorators that decorate the item.

; ── Top-level declarations ────────────────────────────────────────

(function_declaration
  (decorator)? @annotation
  "fn" @context
  name: (identifier) @name) @item

(struct_declaration
  (decorator)? @annotation
  "struct" @context
  name: (type_identifier) @name) @item

(enum_declaration
  (decorator)? @annotation
  "enum" @context
  name: (type_identifier) @name) @item

(error_declaration
  (decorator)? @annotation
  "error" @context
  name: (type_identifier) @name) @item

(trait_declaration
  (decorator)? @annotation
  "trait" @context
  name: (type_identifier) @name) @item

(type_alias
  (decorator)? @annotation
  "type" @context
  name: (type_identifier) @name) @item

(distinct_type
  (decorator)? @annotation
  "distinct" @context
  "type" @context
  name: (type_identifier) @name) @item

(const_declaration
  (decorator)? @annotation
  "const" @context
  name: (identifier) @name) @item

(impl_block
  (decorator)? @annotation
  "impl" @context
  first: (_) @name) @item

(module_declaration
  "module" @context
  path: (module_path) @name) @item

; ── Members within struct / enum / trait / impl bodies ───────────

(enum_variant
  name: (type_identifier) @name) @item

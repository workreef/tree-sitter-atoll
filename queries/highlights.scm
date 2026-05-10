; Atoll syntax highlighting query.
;
; Capture names follow the Zed/Helix/nvim-treesitter convention. Order
; matters: later captures override earlier ones for the same node.

; ─── Comments ─────────────────────────────────────────────────────

(line_comment) @comment
(block_comment) @comment
(doc_comment) @comment.doc

; ─── Literals ─────────────────────────────────────────────────────

(integer_literal) @number
(float_literal) @number
(boolean_literal) @boolean
(char_literal) @string
(byte_literal) @string

(string_literal) @string
(string_content) @string
(escape_sequence) @string.escape
(string_interpolation_ident) @embedded
(string_interpolation) @embedded

(label) @label

; ─── Keywords ─────────────────────────────────────────────────────

[
  "fn"
  "struct"
  "enum"
  "type"
  "distinct"
  "trait"
  "impl"
  "const"
  "module"
  "import"
  "from"
  "as"
  "pub"
  "private"
  "where"
  "using"
  "mut"
  "unsafe"
] @keyword

[
  "if"
  "else"
  "match"
  "for"
  "in"
  "loop"
  "while"
  "return"
  "break"
  "continue"
  "yield"
  "defer"
  "error"
  "catch"
  "spawn"
  "race"
  "select"
] @keyword

[
  "and"
  "or"
  "not"
  "is"
] @keyword.operator

"self" @keyword

; ─── Operators ────────────────────────────────────────────────────

[
  ":="
  "="
  "+"
  "-"
  "*"
  "/"
  "%"
  "=="
  "!="
  "<"
  ">"
  "<="
  ">="
  "&&"
  "||"
  "!"
  "&"
  "|"
  "^"
  "~"
  "<<"
  ">>"
  "??"
  "?."
  "|>"
  "->"
  "=>"
  ".."
  "..="
  "+="
  "-="
  "*="
  "/="
  "%="
  "&="
  "|="
  "^="
  "<<="
  ">>="
  "??="
  "?"
] @operator

; ─── Punctuation ──────────────────────────────────────────────────

[ "(" ")" "{" "}" "[" "]" ] @punctuation.bracket
[ "," ";" ":" "::" "." "@" ] @punctuation.delimiter

; ─── Decorators ───────────────────────────────────────────────────

(decorator
  "@" @attribute
  name: (decorator_path) @attribute)

; ─── Declarations ─────────────────────────────────────────────────

(function_declaration name: (identifier) @function)
(const_declaration name: (identifier) @constant)
(struct_declaration name: (type_identifier) @type)
(enum_declaration name: (type_identifier) @type)
(error_declaration name: (type_identifier) @type)
(trait_declaration name: (type_identifier) @type)
(type_alias name: (type_identifier) @type)
(distinct_type name: (type_identifier) @type)
(enum_variant name: (type_identifier) @variant)

(generic_parameter name: (type_identifier) @type)

; ─── Type references ──────────────────────────────────────────────

(named_type (type_identifier) @type)
(generic_type (named_type (type_identifier) @type))

; Highlight known primitive type names as builtin types. Atoll's
; lexer doesn't reserve these as keywords, so we recognize them
; structurally + by name.
((named_type (type_identifier) @type.builtin)
 (#match? @type.builtin
   "^(int|float|bool|char|byte|String|Bytes|Buffer|Unit|usize|isize|u8|u16|u32|u64|i8|i16|i32|i64|f32|f64|ptr|List|Map|Set|Option|Result|Iterator|Iterable|Task)$"))

; ─── Calls and field access ───────────────────────────────────────

(call_expression
  function: (identifier_expression (identifier) @function.call))

(method_call_expression
  method: (identifier) @function.method)

(field_access_expression
  field: (identifier) @property)

(named_argument
  name: (identifier) @variable.parameter)

; ─── Parameters and bindings ──────────────────────────────────────

(parameter
  name: (identifier) @variable.parameter)

(binding_pattern (identifier) @variable)

(binding_statement name: (identifier) @variable)

; ─── Self / variant constructors ──────────────────────────────────

((identifier_expression (identifier) @keyword)
 (#match? @keyword "^self$"))

; Heuristic: an identifier whose name starts with an uppercase
; letter is most likely a variant constructor or type reference
; (Atoll convention). Applies to expression position AND to bare
; pattern position (e.g. `None` in `match self { None => ..., Some(_) => ... }`,
; which parses as a binding_pattern because it has no payload parens).
((identifier_expression (identifier) @variant)
 (#match? @variant "^[A-Z]"))

((binding_pattern (identifier) @variant)
 (#match? @variant "^[A-Z]"))

; Variant patterns (with payload parens, e.g. `Some(x)`)
(variant_pattern type: (named_type (type_identifier) @variant))

; ─── Loop labels ──────────────────────────────────────────────────

(for_expression label: (label) @label)
(while_expression label: (label) @label)
(loop_expression label: (label) @label)
(break_statement label: (label) @label)
(continue_statement label: (label) @label)

; ─── Boolean literal precedence over identifier (handled by token) ─

/**
 * Tree-sitter grammar for the Atoll language.
 *
 * Tuned for syntax highlighting in Zed/VSCode/etc. Permissive: many
 * forms accept superset shapes the real compiler rejects, in service
 * of recovering structure from incomplete or unusual code.
 *
 * Authoritative source: `crates/atoll-syntax/src/lexer.rs` and
 * `crates/atoll-syntax/src/parser/`.
 */

const PREC = {
  assign: 1,
  pipeline: 2,    // |>
  range: 3,       // .. ..=
  or_kw: 4,       // or, ||
  and_kw: 5,      // and, &&
  not_kw: 6,      // not (unary)
  comparison: 7,  // ==, !=, <, <=, >, >=, is, is not
  bit_or: 8,      // |
  bit_xor: 9,     // ^
  bit_and: 10,    // &
  shift: 11,      // <<, >>
  additive: 12,   // +, -
  multiplicative: 13, // *, /, %
  coalesce: 14,   // ??
  unary: 15,      // -x, !x, ~x
  cast: 16,       // as
  postfix: 17,    // ., (), [], ?, ?., .catch
  primary: 18,
};

module.exports = grammar({
  name: 'atoll',

  word: $ => $.identifier,

  extras: $ => [
    /\s/,
    $.line_comment,
    $.block_comment,
    $.doc_comment,
  ],

  conflicts: $ => [
    [$._expression, $._pattern],
    [$._expression, $.literal_pattern],
    [$.tuple_pattern, $.parenthesized_expression],
    [$.list_pattern, $.list_expression],
    [$.struct_pattern_field, $._expression],
    [$.binding_pattern, $.identifier_expression],
    [$.unsafe_modifier, $.unsafe_block],
    [$.named_type, $.identifier_expression],
    [$.named_type, $.binding_pattern],
    [$.struct_pattern, $.struct_literal],
    [$._expression, $.for_expression],
    [$._expression, $.if_expression],
    [$._expression, $.while_expression],
    [$._expression, $.loop_expression],
    [$.parameter, $.identifier_expression, $.binding_pattern],
    [$.parameter, $.binding_pattern],
    [$.parameter, $.identifier_expression],
    [$.spread_pattern, $.spread_expression],
    [$.spread_pattern, $.identifier_expression],
    [$.range_pattern, $.binary_expression],
    [$._for_binding, $._pattern],
    [$.struct_literal_shorthand, $.struct_pattern_field],
    [$.struct_literal_field, $.struct_pattern_field],
    [$.parameter, $.named_type, $.identifier_expression],
    [$.parameter, $.named_type],
    [$.field_declaration, $.named_type],
  ],

  supertypes: $ => [
    $._expression,
    $._statement,
    $._item,
    $._pattern,
    $._type,
    $._literal,
  ],

  rules: {
    source_file: $ => repeat($._item),

    // ─────────────────────────────────────────────────────────────
    // Items (top-level and nested in struct/enum/trait/impl bodies)
    // ─────────────────────────────────────────────────────────────

    _item: $ => choice(
      $.module_declaration,
      $.import_declaration,
      $.const_declaration,
      $.function_declaration,
      $.struct_declaration,
      $.enum_declaration,
      $.error_declaration,
      $.type_alias,
      $.distinct_type,
      $.trait_declaration,
      $.impl_block,
    ),

    error_declaration: $ => seq(
      repeat($.decorator),
      optional($.visibility_modifier),
      'error',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      field('body', $.enum_body),
    ),

    // ── Decorators (prefix on items, fields, methods) ─────────────

    decorator: $ => seq(
      '@',
      field('name', $.decorator_path),
      optional(field('arguments', $.argument_list)),
    ),

    decorator_path: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier)),
    ),

    // ── Module / import ──────────────────────────────────────────

    module_declaration: $ => seq(
      'module',
      field('path', $.module_path),
      optional(';'),
    ),

    import_declaration: $ => seq(
      'import',
      choice(
        // import { A, B } from "path"
        seq(
          field('items', $.import_items),
          'from',
          field('source', $.string_literal),
        ),
        // import "path" as Alias
        // import "path"
        seq(
          field('source', $.string_literal),
          optional(seq('as', field('alias', $.identifier))),
        ),
      ),
      optional(';'),
    ),

    import_items: $ => seq(
      '{',
      sepBy1(',', seq(
        $.identifier,
        optional(seq('as', $.identifier)),
      )),
      optional(','),
      '}',
    ),

    module_path: $ => sepBy1('.', $.identifier),

    // ── Const ────────────────────────────────────────────────────

    const_declaration: $ => seq(
      repeat($.decorator),
      optional($.visibility_modifier),
      'const',
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
      optional(';'),
    ),

    // ── Function ─────────────────────────────────────────────────

    function_declaration: $ => prec.right(seq(
      repeat($.decorator),
      optional($.visibility_modifier),
      optional($.unsafe_modifier),
      'fn',
      field('name', $.identifier),
      optional(field('type_parameters', $.generic_parameters)),
      field('parameters', $.parameter_list),
      optional(choice(
        seq(':', field('return_type', $._type)),
        // colonless return type: prefer when present to avoid greedy
        // consumption of the next item's `fn`/identifier.
        prec.dynamic(1, field('return_type', $._type)),
      )),
      optional(field('using_clause', $.using_clause)),
      optional(field('where_clause', $.where_clause)),
      choice(
        field('body', $.block),
        seq('=>', field('body', $._expression), optional(';')),
        optional(';'),               // bodyless fn (intrinsic / trait stub)
      ),
    )),

    parameter_list: $ => seq(
      '(',
      optional(seq(
        sepBy1(',', $.parameter),
        optional(','),
      )),
      ')',
    ),

    parameter: $ => choice(
      // self / mut self
      seq(optional('mut'), 'self'),
      // name (: type)? (= default)?  — colon is optional
      seq(
        optional('mut'),
        field('name', $.identifier),
        optional(seq(optional(':'), field('type', $._type))),
        optional(seq('=', field('default', $._expression))),
      ),
    ),

    using_clause: $ => seq(
      'using',
      choice(
        $.identifier,
        seq('<', sepBy1(',', $.identifier), '>'),
      ),
    ),

    where_clause: $ => seq(
      'where',
      sepBy1(',', $.where_predicate),
    ),

    where_predicate: $ => seq(
      $._type,
      ':',
      sepBy1('+', $._type),
    ),

    // ── Struct ───────────────────────────────────────────────────

    struct_declaration: $ => seq(
      repeat($.decorator),
      optional($.visibility_modifier),
      'struct',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      optional(field('where_clause', $.where_clause)),
      field('body', $.struct_body),
    ),

    struct_body: $ => seq(
      '{',
      repeat(choice(
        seq($.field_declaration, optional(',')),
        $.function_declaration,
        $.const_declaration,
        $.type_alias,
      )),
      '}',
    ),

    field_declaration: $ => prec.right(seq(
      repeat($.decorator),
      optional($.visibility_modifier),
      field('name', $.identifier),
      optional(':'),
      field('type', $._type),
      optional(seq('=', field('default', $._expression))),
    )),

    // ── Enum ─────────────────────────────────────────────────────

    enum_declaration: $ => seq(
      repeat($.decorator),
      optional($.visibility_modifier),
      'enum',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      optional(field('where_clause', $.where_clause)),
      field('body', $.enum_body),
    ),

    enum_body: $ => seq(
      '{',
      repeat(choice(
        $.enum_variant,
        $.function_declaration,
        $.const_declaration,
        $.type_alias,
      )),
      '}',
    ),

    enum_variant: $ => seq(
      repeat($.decorator),
      field('name', alias($.identifier, $.type_identifier)),
      optional(choice(
        $.enum_variant_tuple,
        $.enum_variant_struct,
      )),
      optional(','),
    ),

    enum_variant_tuple: $ => seq(
      '(',
      sepBy(',', $._type),
      optional(','),
      ')',
    ),

    enum_variant_struct: $ => seq(
      '{',
      sepBy(',', $.field_declaration),
      optional(','),
      '}',
    ),

    // ── Type alias / distinct ────────────────────────────────────

    type_alias: $ => seq(
      repeat($.decorator),
      optional($.visibility_modifier),
      'type',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      choice(
        seq('=', field('value', $._type)),
        seq(':', field('bound', sepBy1('+', $._type))),
        // bare: `type Name` for associated types without bound
      ),
      optional(';'),
    ),

    distinct_type: $ => seq(
      repeat($.decorator),
      optional($.visibility_modifier),
      'distinct',
      'type',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      '=',
      field('value', $._type),
      optional(';'),
    ),

    // ── Trait ────────────────────────────────────────────────────

    trait_declaration: $ => seq(
      repeat($.decorator),
      optional($.visibility_modifier),
      'trait',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      optional(field('super_traits', seq(':', sepBy1('+', $._type)))),
      optional(field('where_clause', $.where_clause)),
      field('body', $.trait_body),
    ),

    trait_body: $ => seq(
      '{',
      repeat(choice(
        $.function_declaration,
        $.const_declaration,
        $.type_alias,
      )),
      '}',
    ),

    // ── Impl ─────────────────────────────────────────────────────

    impl_block: $ => seq(
      repeat($.decorator),
      'impl',
      optional(field('type_parameters', $.generic_parameters)),
      // `impl Trait for Type` or `impl Type`
      seq(
        field('first', $._type),
        optional(seq('for', field('target', $._type))),
      ),
      optional(field('where_clause', $.where_clause)),
      field('body', $.impl_body),
    ),

    impl_body: $ => seq(
      '{',
      repeat(choice(
        $.function_declaration,
        $.const_declaration,
        $.type_alias,
      )),
      '}',
    ),

    // ─────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────

    visibility_modifier: $ => choice('pub', 'private'),
    unsafe_modifier: _ => 'unsafe',

    // ─────────────────────────────────────────────────────────────
    // Generic parameters / arguments
    // ─────────────────────────────────────────────────────────────

    generic_parameters: $ => seq(
      '[',
      sepBy1(',', $.generic_parameter),
      optional(','),
      ']',
    ),

    generic_parameter: $ => seq(
      field('name', alias($.identifier, $.type_identifier)),
      optional(seq(':', sepBy1('+', $._type))),
      optional(seq('=', field('default', $._type))),
    ),

    generic_arguments: $ => prec.dynamic(1, seq(
      '[',
      sepBy1(',', $._type),
      optional(','),
      ']',
    )),

    // ─────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────

    _type: $ => choice(
      $.generic_type,
      $.named_type,
      $.tuple_type,
      $.list_type,
      $.optional_type,
      $.fallible_type,
      $.function_type,
      $.unsafe_type,
      $.union_type,
      $.unit_type,
      $.never_type,
    ),

    named_type: $ => alias($.identifier, $.type_identifier),

    generic_type: $ => prec(1, seq(
      $.named_type,
      $.generic_arguments,
    )),

    tuple_type: $ => seq(
      '(',
      $._type,
      ',',
      sepBy(',', $._type),
      optional(','),
      ')',
    ),

    list_type: $ => prec.right(3, seq(
      '[',
      ']',
      $._type,
    )),

    optional_type: $ => prec(2, seq($._type, '?')),
    fallible_type: $ => prec.left(1, seq($._type, '!', $._type)),

    function_type: $ => prec.right(seq(
      'fn',
      '(',
      sepBy(',', $._type),
      optional(','),
      ')',
      optional(seq(choice('->', ':'), $._type)),
    )),

    unsafe_type: $ => prec(1, seq('unsafe', $.function_type)),

    union_type: $ => prec.left(0, seq($._type, '|', $._type)),

    unit_type: $ => prec(2, seq('(', ')')),
    never_type: _ => '!',

    // ─────────────────────────────────────────────────────────────
    // Statements
    // ─────────────────────────────────────────────────────────────

    _statement: $ => choice(
      $.binding_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.yield_statement,
      $.defer_statement,
      $.error_statement,
      $.expression_statement,
    ),

    binding_statement: $ => choice(
      // mut name := expr
      seq(
        'mut',
        field('pattern', $._pattern),
        ':=',
        field('value', $._expression),
        optional(';'),
      ),
      // name := expr / pat := expr (let-style)
      seq(
        field('pattern', $._pattern),
        ':=',
        field('value', $._expression),
        optional(seq('else', field('else_branch', $.block))),
        optional(';'),
      ),
      // name : Type = expr  (typed binding, optionally mut)
      // name : Type        (uninitialized typed binding)
      prec.right(1, seq(
        optional('mut'),
        field('name', $.identifier),
        ':',
        field('type', $._type),
        optional(seq('=', field('value', $._expression))),
        optional(';'),
      )),
    ),

    return_statement: $ => prec.right(seq(
      'return',
      optional(field('value', $._expression)),
      optional(';'),
    )),

    break_statement: $ => prec.right(seq(
      'break',
      optional(field('label', $.label)),
      optional(field('value', $._expression)),
      optional(';'),
    )),

    continue_statement: $ => prec.right(seq(
      'continue',
      optional(field('label', $.label)),
      optional(';'),
    )),

    yield_statement: $ => prec.right(seq(
      'yield',
      optional(field('value', $._expression)),
      optional(';'),
    )),

    defer_statement: $ => seq(
      'defer',
      field('body', $._expression),
      optional(';'),
    ),

    error_statement: $ => seq(
      'error',
      field('value', $._expression),
      optional(';'),
    ),

    expression_statement: $ => seq(
      $._expression,
      optional(';'),
    ),

    // ─────────────────────────────────────────────────────────────
    // Expressions
    // ─────────────────────────────────────────────────────────────

    _expression: $ => choice(
      $._literal,
      $.identifier_expression,
      $.path_expression,
      $.parenthesized_expression,
      $.tuple_expression,
      $.list_expression,
      $.struct_literal,
      $.block,
      $.unsafe_block,
      $.if_expression,
      $.match_expression,
      $.for_expression,
      $.loop_expression,
      $.while_expression,
      $.spawn_expression,
      $.race_expression,
      $.select_expression,
      $.lambda_expression,
      $.unary_expression,
      $.binary_expression,
      $.cast_expression,
      $.range_expression,
      $.assignment_expression,
      $.call_expression,
      $.method_call_expression,
      $.field_access_expression,
      $.index_expression,
      $.optional_call,                // ?. and ?
      $.try_expression,               // expr.catch
    ),

    identifier_expression: $ => $.identifier,

    path_expression: $ => prec(1, seq(
      $.identifier,
      repeat1(seq(choice('::'), $.identifier)),
    )),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple_expression: $ => seq(
      '(',
      $._expression,
      ',',
      sepBy(',', $._expression),
      optional(','),
      ')',
    ),

    list_expression: $ => seq(
      '[',
      sepBy(',', $._expression),
      optional(','),
      ']',
    ),

    struct_literal: $ => prec(1, seq(
      field('type', choice($.named_type, $.generic_type)),
      '{',
      sepBy(',', choice(
        $.struct_literal_field,
        $.struct_literal_shorthand,
        $.spread_expression,
      )),
      optional(','),
      '}',
    )),

    struct_literal_field: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression),
    ),

    struct_literal_shorthand: $ => $.identifier,

    spread_expression: $ => seq('..', $._expression),

    block: $ => seq(
      '{',
      repeat($._statement),
      '}',
    ),

    unsafe_block: $ => seq('unsafe', $.block),

    if_expression: $ => prec.right(seq(
      'if',
      choice(
        // if-let: if pat := value { ... }
        seq(
          field('pattern', $._pattern),
          ':=',
          field('scrutinee', $._expression),
        ),
        field('condition', $._expression),
      ),
      field('then', $.block),
      optional(seq(
        'else',
        field('else', choice($.block, $.if_expression)),
      )),
    )),

    match_expression: $ => seq(
      'match',
      field('scrutinee', $._expression),
      '{',
      repeat($.match_arm),
      '}',
    ),

    match_arm: $ => seq(
      field('pattern', $._pattern),
      optional(seq('if', field('guard', $._expression))),
      '=>',
      field('body', choice(
        $._expression,
        $.return_statement,
        $.break_statement,
        $.continue_statement,
        $.yield_statement,
        $.error_statement,
      )),
      optional(','),
    ),

    for_expression: $ => prec.right(seq(
      optional(field('label', seq($.label, ':'))),
      'for',
      optional(choice(
        // for x in xs
        // for k, v in map  (Atoll bare-comma sugar)
        seq(
          field('binding', $._for_binding),
          'in',
          field('iter', $._expression),
        ),
        // for cond
        field('condition', $._expression),
      )),
      field('body', $.block),
    )),

    _for_binding: $ => choice(
      $._pattern,
      seq($.identifier, ',', $.identifier),
    ),

    loop_expression: $ => seq(
      optional(field('label', seq($.label, ':'))),
      'loop',
      field('body', $.block),
    ),

    while_expression: $ => seq(
      optional(field('label', seq($.label, ':'))),
      'while',
      field('condition', $._expression),
      field('body', $.block),
    ),

    spawn_expression: $ => prec.right(seq('spawn', $._expression)),

    race_expression: $ => seq('race', $.block),
    select_expression: $ => seq('select', $.block),

    lambda_expression: $ => choice(
      // bare: x => expr   (x, y) => expr
      prec.right(-1, seq(
        field('parameters', choice(
          $.identifier,
          $.lambda_parameters,
        )),
        '=>',
        field('body', $._expression),
      )),
      // braced: { x => body }   { => body }   { (x, y) => body }
      prec.right(seq(
        '{',
        optional(field('parameters', choice(
          $.identifier,
          $.lambda_parameters,
        ))),
        '=>',
        field('body', $._expression),
        '}',
      )),
    ),

    lambda_parameters: $ => seq(
      '(', sepBy(',', $.parameter), ')',
    ),

    unary_expression: $ => choice(
      prec.right(PREC.unary, seq(
        field('operator', choice('-', '!', '~')),
        field('argument', $._expression),
      )),
      prec.right(PREC.not_kw, seq(
        field('operator', 'not'),
        field('argument', $._expression),
      )),
    ),

    binary_expression: $ => {
      const ops = [
        [PREC.pipeline,        '|>',          'left'],
        [PREC.coalesce,        '??',          'left'],
        [PREC.or_kw,           '||',          'left'],
        [PREC.or_kw,           'or',          'left'],
        [PREC.and_kw,          '&&',          'left'],
        [PREC.and_kw,          'and',         'left'],
        [PREC.comparison,      '==',          'left'],
        [PREC.comparison,      '!=',          'left'],
        [PREC.comparison,      '<',           'left'],
        [PREC.comparison,      '<=',          'left'],
        [PREC.comparison,      '>',           'left'],
        [PREC.comparison,      '>=',          'left'],
        [PREC.comparison,      'is',          'left'],
        [PREC.bit_or,          '|',           'left'],
        [PREC.bit_xor,         '^',           'left'],
        [PREC.bit_and,         '&',           'left'],
        [PREC.shift,           '<<',          'left'],
        [PREC.shift,           '>>',          'left'],
        [PREC.additive,        '+',           'left'],
        [PREC.additive,        '-',           'left'],
        [PREC.multiplicative,  '*',           'left'],
        [PREC.multiplicative,  '/',           'left'],
        [PREC.multiplicative,  '%',           'left'],
      ];
      return choice(...ops.map(([p, op, assoc]) =>
        (assoc === 'right' ? prec.right : prec.left)(p, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._expression),
        )),
      ));
    },

    cast_expression: $ => prec.left(PREC.cast, seq(
      field('value', $._expression),
      'as',
      field('type', $._type),
    )),

    range_expression: $ => prec.left(PREC.range, choice(
      seq($._expression, choice('..', '..='), $._expression),
      seq($._expression, choice('..', '..=')),
      seq(choice('..', '..='), $._expression),
    )),

    assignment_expression: $ => prec.right(PREC.assign, seq(
      field('target', $._expression),
      field('operator', choice(
        '=', '+=', '-=', '*=', '/=', '%=',
        '&=', '|=', '^=', '<<=', '>>=', '??=',
      )),
      field('value', $._expression),
    )),

    call_expression: $ => prec(PREC.postfix, seq(
      field('function', $._expression),
      optional(field('type_arguments', $.generic_arguments)),
      field('arguments', $.argument_list),
    )),

    method_call_expression: $ => prec(PREC.postfix + 1, seq(
      field('receiver', $._expression),
      '.',
      field('method', $.identifier),
      optional(field('type_arguments', $.generic_arguments)),
      field('arguments', $.argument_list),
    )),

    field_access_expression: $ => prec(PREC.postfix, seq(
      field('object', $._expression),
      '.',
      field('field', $.identifier),
    )),

    index_expression: $ => prec(PREC.postfix, seq(
      field('object', $._expression),
      '[',
      field('index', $._expression),
      ']',
    )),

    optional_call: $ => choice(
      prec(PREC.postfix, seq(
        field('object', $._expression),
        '?.',
        field('field', $.identifier),
      )),
      prec(PREC.postfix, seq(
        field('object', $._expression),
        '?',
      )),
    ),

    try_expression: $ => prec(PREC.postfix, seq(
      field('value', $._expression),
      '.',
      'catch',
    )),

    argument_list: $ => seq(
      '(',
      sepBy(',', choice(
        $.named_argument,
        $._expression,
      )),
      optional(','),
      ')',
    ),

    named_argument: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression),
    ),

    // ─────────────────────────────────────────────────────────────
    // Patterns
    // ─────────────────────────────────────────────────────────────

    _pattern: $ => choice(
      $.wildcard_pattern,
      $.literal_pattern,
      $.binding_pattern,
      $.tuple_pattern,
      $.list_pattern,
      $.struct_pattern,
      $.variant_pattern,
      $.range_pattern,
      $.or_pattern,
      $.parenthesized_pattern,
      $.spread_pattern,
    ),

    wildcard_pattern: _ => '_',
    literal_pattern: $ => $._literal,

    binding_pattern: $ => prec.right(seq(
      $.identifier,
      optional(seq('@', $._pattern)),
    )),

    tuple_pattern: $ => seq(
      '(',
      $._pattern,
      ',',
      sepBy(',', $._pattern),
      optional(','),
      ')',
    ),

    list_pattern: $ => seq(
      '[',
      sepBy(',', $._pattern),
      optional(','),
      ']',
    ),

    struct_pattern: $ => prec(1, seq(
      field('type', choice($.named_type, $.generic_type)),
      '{',
      sepBy(',', $.struct_pattern_field),
      optional(','),
      optional(seq('..', optional($.identifier))),
      '}',
    )),

    struct_pattern_field: $ => choice(
      seq(field('name', $.identifier), ':', field('pattern', $._pattern)),
      $.identifier,
      $.spread_pattern,
    ),

    variant_pattern: $ => prec(1, seq(
      field('type', choice($.named_type, $.generic_type)),
      '(',
      sepBy(',', $._pattern),
      optional(','),
      ')',
    )),

    range_pattern: $ => prec.left(2, seq(
      choice($.literal_pattern, $.binding_pattern),
      choice('..', '..='),
      choice($.literal_pattern, $.binding_pattern),
    )),

    or_pattern: $ => prec.left(seq(
      $._pattern,
      '|',
      $._pattern,
    )),

    parenthesized_pattern: $ => seq('(', $._pattern, ')'),
    spread_pattern: $ => seq('..', optional($.identifier)),

    // ─────────────────────────────────────────────────────────────
    // Literals
    // ─────────────────────────────────────────────────────────────

    _literal: $ => choice(
      $.integer_literal,
      $.float_literal,
      $.string_literal,
      $.char_literal,
      $.byte_literal,
      $.boolean_literal,
    ),

    integer_literal: _ => token(seq(
      choice(
        /0x[0-9a-fA-F][0-9a-fA-F_]*/,
        /0b[01][01_]*/,
        /0o[0-7][0-7_]*/,
        /[0-9][0-9_]*/,
      ),
      optional(/[ui](8|16|32|64|size)|f(32|64)/),
    )),

    float_literal: _ => token(choice(
      // 1.5, 1.5e10, 1.5e-10, with optional underscores
      seq(/[0-9][0-9_]*/, '.', /[0-9][0-9_]*/, optional(/[eE][+-]?[0-9][0-9_]*/), optional(/f(32|64)/)),
      // 1e10
      seq(/[0-9][0-9_]*/, /[eE][+-]?[0-9][0-9_]*/, optional(/f(32|64)/)),
    )),

    string_literal: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
        $.string_interpolation,
        $.string_interpolation_ident,
      )),
      '"',
    ),

    string_content: _ => token.immediate(prec(1, /[^"\\$]+/)),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        /[\\nrt0"'$]/,
        /x[0-9a-fA-F]{2}/,
        /u[0-9a-fA-F]{4}/,
        /u\{[0-9a-fA-F]+\}/,
      ),
    )),

    // `${expr}` — opaque body for v1; full re-parsing deferred.
    string_interpolation: $ => seq(
      token.immediate('${'),
      /[^}]*/,
      '}',
    ),

    // `$ident` shorthand
    string_interpolation_ident: _ => token.immediate(seq(
      '$',
      /[a-zA-Z_][a-zA-Z0-9_]*/,
    )),

    char_literal: _ => token(seq(
      "'",
      choice(
        /[^'\\\n]/,
        seq('\\', choice(
          /[\\nrt0"'$]/,
          /x[0-9a-fA-F]{2}/,
          /u[0-9a-fA-F]{4}/,
          /u\{[0-9a-fA-F]+\}/,
        )),
      ),
      "'",
    )),

    byte_literal: _ => token(seq(
      "b'",
      choice(
        /[^'\\\n]/,
        seq('\\', choice(
          /[\\nrt0"']/,
          /x[0-9a-fA-F]{2}/,
        )),
      ),
      "'",
    )),

    boolean_literal: _ => choice('true', 'false'),

    label: _ => token(seq("'", /[a-zA-Z_][a-zA-Z0-9_]*/)),

    // ─────────────────────────────────────────────────────────────
    // Identifiers
    // ─────────────────────────────────────────────────────────────

    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // Same lexical class — distinguished only by being in a
    // type position. Lets highlight queries target type names.

    // ─────────────────────────────────────────────────────────────
    // Comments
    // ─────────────────────────────────────────────────────────────

    line_comment: _ => token(seq('//', /[^\n]*/)),
    doc_comment: _ => token(seq('///', /[^\n]*/)),
    block_comment: _ => token(seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/',
    )),
  },
});

function sepBy(sep, rule) {
  return optional(sepBy1(sep, rule));
}

function sepBy1(sep, rule) {
  return seq(rule, repeat(seq(sep, rule)));
}

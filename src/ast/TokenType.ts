type TokenType =
    // Single-character tokens.
    "LEFT_PAREN" |
    "RIGHT_PAREN" |
    "LEFT_BRACE" |
    "RIGHT_BRACE" |
    "LEFT_BRACKET" |
    "RIGHT_BRACKET" |
    "COMMA" |
    "DOT" |
    "MINUS" |
    "PLUS" |
    "COLON" |
    "SEMICOLON" |
    "SLASH" |
    "STAR" |
    "PIPE" |

    // One or two character tokens.
    "BANG" |
    "BANG_EQUAL" |
    "EQUAL" |
    "EQUAL_EQUAL" |
    "GREATER" |
    "GREATER_EQUAL" |
    "LESS" |
    "LESS_EQUAL" |

    // Literals.
    "IDENTIFIER" |
    "STRING" |
    "NUMBER" |

    // Keywords.
    "AND" |
    "CLASS" |
    "ELSE" |
    "FALSE" |
    "FUN" |
    "FOR" |
    "IF" |
    "NIL" |
    "OR" |
    "PRINT" |
    "RETURN" |
    "SUPER" |
    "THIS" |
    "TRUE" |
    "TYPE" |
    "VAR" |
    "WHILE" |

    // End of file.
    "EOF";

export default TokenType;

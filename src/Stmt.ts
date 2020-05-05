// This file is programatically generated. Do not edit it directly.

import Expr from "./Expr";
import Token from "./Token";

export abstract class Stmt {
    abstract accept<R>(visitor: StmtVisitor<R>): R;
}

export default Stmt;

export interface StmtVisitor<R> {
    visitBlockStmt(stmt: BlockStmt): R;
    visitExpressionStmt(stmt: ExpressionStmt): R;
    visitFunctionStmt(stmt: FunctionStmt): R;
    visitIfStmt(stmt: IfStmt): R;
    visitPrintStmt(stmt: PrintStmt): R;
    visitVarStmt(stmt: VarStmt): R;
    visitWhileStmt(stmt: WhileStmt): R;
}

export class BlockStmt extends Stmt {
    constructor(
        readonly statements: Stmt[],
    ) {
        super();
        this.statements = statements;
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitBlockStmt(this);
    }
}

export class ExpressionStmt extends Stmt {
    constructor(
        readonly expression: Expr,
    ) {
        super();
        this.expression = expression;
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitExpressionStmt(this);
    }
}

export class FunctionStmt extends Stmt {
    constructor(
        readonly name: Token,
        readonly params: Token[],
        readonly body: Stmt[],
    ) {
        super();
        this.name = name;
        this.params = params;
        this.body = body;
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitFunctionStmt(this);
    }
}

export class IfStmt extends Stmt {
    constructor(
        readonly condition: Expr,
        readonly thenBranch: Stmt,
        readonly elseBranch: Stmt | null,
    ) {
        super();
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitIfStmt(this);
    }
}

export class PrintStmt extends Stmt {
    constructor(
        readonly expression: Expr,
    ) {
        super();
        this.expression = expression;
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitPrintStmt(this);
    }
}

export class VarStmt extends Stmt {
    constructor(
        readonly name: Token,
        readonly initializer: Expr | null,
    ) {
        super();
        this.name = name;
        this.initializer = initializer;
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitVarStmt(this);
    }
}

export class WhileStmt extends Stmt {
    constructor(
        readonly condtion: Expr,
        readonly body: Stmt,
    ) {
        super();
        this.condtion = condtion;
        this.body = body;
    }

    accept<R>(visitor: StmtVisitor<R>): R {
        return visitor.visitWhileStmt(this);
    }
}

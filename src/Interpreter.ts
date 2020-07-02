import Lox from "./Lox";
import LoxValue from "./LoxValue";
import Token from "./Token";
import Environment from "./Environment";
import RuntimeError from "./RuntimeError";
import {
    Expr,
    BinaryExpr,
    GroupingExpr,
    LiteralExpr,
    UnaryExpr,
    ExprVisitor,
    VariableExpr,
    AssignExpr,
    LogicalExpr,
    CallExpr,
    GetExpr,
    SetExpr,
    ThisExpr,
    SuperExpr,
} from "./Expr";
import {
    Stmt,
    StmtVisitor,
    ExpressionStmt,
    PrintStmt,
    VarStmt,
    BlockStmt,
    IfStmt,
    WhileStmt,
    FunctionStmt,
    ReturnStmt,
    ClassStmt,
} from "./Stmt";
import {isLoxCallable} from "./LoxCallable";
import LoxFunction from "./LoxFunction";
import LoxClass from "./LoxClass";
import Return from "./Return";
import LoxInstance from "./LoxInstance";
import { nil } from "./LoxNil";
import { loxFalse, loxTrue } from "./LoxBool";
import LoxNumber from "./LoxNumber";
import LoxString from "./LoxString";
import { isTruthy, isEqual } from "./coreSemantics";
import * as globals from "./globals";

export default class Interpreter
implements ExprVisitor<LoxValue>, StmtVisitor<void> {
    readonly globals: Environment = Environment.fromObject(globals);
    private environment = this.globals;
    private readonly locals: Map<Expr, number> = new Map();

    constructor(private readonly lox: Lox) {}

    interpret(statements: Stmt[]): void {
        try {
            for (const statement of statements) {
                this.execute(statement);
            }
        } catch (error) {
            if (error instanceof RuntimeError) {
                this.lox.runtimeError(error);
            } else throw error;
        }
    }

    private evaluate(expr: Expr): LoxValue {
        return expr.accept(this);
    }

    private execute(stmt: Stmt): void {
        stmt.accept(this);
    }

    resolve(expr: Expr, depth: number): void {
        this.locals.set(expr, depth);
    }

    executeBlock(statements: Stmt[], environment: Environment): void {
        const previous = this.environment;
        try {
            this.environment = environment;

            for (const statement of statements) {
                this.execute(statement);
            }
        } finally {
            this.environment = previous;
        }
    }

    visitBlockStmt(stmt: BlockStmt): void {
        this.executeBlock(stmt.statements, new Environment(this.environment));
    }

    visitClassStmt(stmt: ClassStmt): void {
        let superclass = null;

        if (stmt.superclass) {
            superclass = this.evaluate(stmt.superclass);
            if (!(superclass instanceof LoxClass)) {
                throw new RuntimeError(
                    "Superclass must be a class.",
                    stmt.superclass.name,
                );
            }
        }

        this.environment.define(stmt.name.lexeme, nil);

        if (superclass) {
            this.environment = new Environment(this.environment);
            this.environment.define("super", superclass);
        }

        const methods = new Map<string,  LoxFunction>();
        for (const methodStmt of stmt.methods) {
            const isInitializer = methodStmt.name.lexeme === "init";
            const method = new LoxFunction(
                methodStmt, this.environment, isInitializer);
            methods.set(methodStmt.name.lexeme, method);
        }

        const loxClass = new LoxClass(stmt.name.lexeme, methods, superclass);

        if (stmt.superclass) {
            this.environment = this.environment.enclosing as Environment;
        }
        this.environment.assign(stmt.name, loxClass);
    }

    visitExpressionStmt(stmt: ExpressionStmt): void {
        this.evaluate(stmt.expression);
    }

    visitFunctionStmt(stmt: FunctionStmt): void {
        const func = new LoxFunction(stmt, this.environment);
        this.environment.define(stmt.name.lexeme, func);
    }

    visitIfStmt(stmt: IfStmt): void {
        if (isTruthy(this.evaluate(stmt.condition))) {
            this.execute(stmt.thenBranch);
        } else if (stmt.elseBranch) {
            this.execute(stmt.elseBranch);
        }
    }

    visitPrintStmt(stmt: PrintStmt): void {
        const value = this.evaluate(stmt.expression);
        this.lox.print(value.toString());
    }

    visitReturnStmt(stmt: ReturnStmt): void {
        const value = stmt.value ? this.evaluate(stmt.value) : nil;
        throw new Return(value);
    }

    visitVarStmt(stmt: VarStmt): void {
        const value = stmt.initializer ? this.evaluate(stmt.initializer) : nil;
        this.environment.define(stmt.name.lexeme, value);
    }

    visitWhileStmt(stmt: WhileStmt): void {
        while (isTruthy(this.evaluate(stmt.condition))) {
            this.execute(stmt.body);
        }
    }

    visitAssignExpr(expr: AssignExpr): LoxValue {
        const value = this.evaluate(expr.value);

        const distance = this.locals.get(expr);
        if (distance !== undefined) {
            this.environment.assignAt(distance, expr.name, value);
        } else {
            this.globals.assign(expr.name, value);
        }

        return value;
    }

    visitLiteralExpr(expr: LiteralExpr): LoxValue {
        return expr.value;
    }

    visitLogicalExpr(expr: LogicalExpr): LoxValue {
        const left = this.evaluate(expr.left);

        switch (expr.operator.type) {
            case "OR":
                if (isTruthy(left)) return left;
                break;
            case "AND":
                if (!isTruthy(left)) return left;
                break;
            default:
                // Unreachable
                throw new Error(
                    `Unexpected logical operator: ${expr.operator.lexeme}`);
        }
        return this.evaluate(expr.right);
    }

    visitSetExpr(expr: SetExpr): LoxValue {
        const object = this.evaluate(expr.object);

        if (!(object instanceof LoxInstance)) {
            throw new RuntimeError("Only instances have fields.", expr.name);
        }

        const value = this.evaluate(expr.value);
        object.set(expr.name, value);
        return value;
    }

    visitSuperExpr(expr: SuperExpr): LoxValue {
        const distance = this.locals.get(expr);
        if (distance === undefined) {
            throw new RuntimeError("Unable to lookup 'super'.", expr.keyword);
        }
        const superclass =
            this.environment.getAt(distance, "super") as LoxClass;

        // "this" is always one level nearer than "super"'s environment
        const thisObject =
            this.environment.getAt(distance - 1, "this") as LoxInstance;

        const method = superclass.findMethod(expr.method.lexeme);

        if (!method) {
            throw new RuntimeError(
                `Undefined property '${expr.method.lexeme}'.`, expr.method);
        }

        return method.bind(thisObject);
    }

    visitThisExpr(expr: ThisExpr): LoxValue {
        return this.lookupVariable(expr.keyword, expr);
    }

    visitGroupingExpr(expr: GroupingExpr): LoxValue {
        return this.evaluate(expr.expression);
    }

    visitUnaryExpr(expr: UnaryExpr): LoxValue {
        const right = this.evaluate(expr.right);

        // TODO add specific UnaryOperator type to detech totality
        switch (expr.operator.type) {
            case "BANG":
                return isTruthy(right) ? loxFalse : loxTrue;
            case "MINUS":
                return new LoxNumber(
                    -this.getNumberOperandValue(expr.operator, right));
        }

        // Unreachable
        throw new Error(`Unexpected unary operator: ${expr.operator.lexeme}`);
    }

    visitVariableExpr(expr: VariableExpr): LoxValue {
        return this.lookupVariable(expr.name, expr);
    }

    private lookupVariable(name: Token, expr: Expr): LoxValue {
        const distance = this.locals.get(expr);
        if (distance !== undefined) {
            return this.environment.getAt(distance, name.lexeme);
        } else {
            return this.globals.get(name);
        }
    }

    visitBinaryExpr(expr: BinaryExpr): LoxValue {
        const left = this.evaluate(expr.left);
        const right = this.evaluate(expr.right);
        let leftValue, rightValue;

        switch (expr.operator.type) {
            case "PLUS":
                if (left.type === "NUMBER" && right.type === "NUMBER") {
                    return new LoxNumber(
                        left.value + right.value);
                }
                if (left.type === "STRING" && right.type === "STRING") {
                    return new LoxString(left.value + right.value);
                }
                throw new RuntimeError(
                    "Operands must be two numbers or two strings.",
                    expr.operator,
                );
            case "MINUS":
                [leftValue, rightValue] =
                    this.getNumberOperandValues(expr.operator, left, right);
                return new LoxNumber(leftValue - rightValue);
            case "SLASH":
                [leftValue, rightValue] =
                    this.getNumberOperandValues(expr.operator, left, right);
                return new LoxNumber(leftValue / rightValue);
            case "STAR":
                [leftValue, rightValue] =
                    this.getNumberOperandValues(expr.operator, left, right);
                return new LoxNumber(leftValue * rightValue);
            case "GREATER":
                [leftValue, rightValue] =
                    this.getNumberOperandValues(expr.operator, left, right);
                return leftValue > rightValue ? loxTrue : loxFalse;
            case "GREATER_EQUAL":
                [leftValue, rightValue] =
                    this.getNumberOperandValues(expr.operator, left, right);
                return leftValue >= rightValue ? loxTrue : loxFalse;
            case "LESS":
                [leftValue, rightValue] =
                    this.getNumberOperandValues(expr.operator, left, right);
                return leftValue < rightValue ? loxTrue : loxFalse;
            case "LESS_EQUAL":
                [leftValue, rightValue] =
                    this.getNumberOperandValues(expr.operator, left, right);
                return leftValue <= rightValue ? loxTrue : loxFalse;
            case "EQUAL_EQUAL":
                return isEqual(left, right) ? loxTrue : loxFalse;
            case "BANG_EQUAL":
                return isEqual(left, right) ? loxFalse : loxTrue;
        }

        // Unreachable
        throw new Error(`Unexpected binary operator: ${expr.operator.lexeme}`);
    }

    visitCallExpr(expr: CallExpr): LoxValue {
        const callee = this.evaluate(expr.callee);
        const args = expr.args.map(arg => this.evaluate(arg));

        if (!isLoxCallable(callee)) {
            throw new RuntimeError(
                "Can only call functions and classes.",
                expr.paren,
            );
        }

        if (args.length !== callee.arity()) {
            throw new RuntimeError(
                `Expected ${callee.arity()} arguments but got ${args.length}.`,
                expr.paren,
            );
        }

        try {
            return callee.call(this, args);
        } catch (error) {
            // Add the missing location token to runtime errors raised by
            // native functions.
            if (error instanceof RuntimeError && error.token === null) {
                error.token = expr.paren;
            }
            throw error;
        }
    }

    visitGetExpr(expr: GetExpr): LoxValue {
        const object = this.evaluate(expr.object);
        return object.get(expr.name);
    }

    private getNumberOperandValue(
        operator: Token,
        operand: LoxValue,
    ): number {
        if (operand.type === "NUMBER") return operand.value;
        throw new RuntimeError("Operand must be a number.", operator);
    }

    private getNumberOperandValues(
        operator: Token,
        left: LoxValue,
        right: LoxValue,
    ): [number, number] {
        if (left.type === "NUMBER" && right.type === "NUMBER") {
            return [left.value, right.value];
        }
        throw new RuntimeError("Operands must be numbers.", operator);
    }
}

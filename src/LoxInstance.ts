import LoxClass from "./LoxClass";
import LoxValue from "./LoxValue";
import Token from "./Token";
import RuntimeError from "./RuntimeError";

export default class LoxInstance {
    private readonly fields = new Map<string, LoxValue>();
    constructor(private loxClass: LoxClass) {
        this.loxClass = loxClass;
    }

    toString(): string {
        return `${this.loxClass.name} instance`;
    }

    get(name: Token): LoxValue {
        const value = this.fields.get(name.lexeme);

        if (value === undefined) {
            throw new RuntimeError(
                name, `Undefined property '${name.lexeme}'.`);
        }

        return value;
    }

    set(name: Token, value: LoxValue): void {
        this.fields.set(name.lexeme, value);
    }
}
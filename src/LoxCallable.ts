import Interpreter from "./Interpreter";
import LoxValue from "./LoxValue";
import NativeFunction from "./NativeFunction";
import LoxFunction from "./LoxFunction";
import LoxClass from "./LoxClass";

export interface LoxCallable {
    type: LoxValue["type"];
    arity(): number;
    call(interpreter: Interpreter, args: LoxValue[]): LoxValue;
}
export default LoxCallable;

export function isLoxCallable(value: LoxValue): value is LoxCallable & LoxValue {
    return (
        value instanceof NativeFunction ||
        value instanceof LoxFunction ||
        value instanceof LoxClass
    );
}

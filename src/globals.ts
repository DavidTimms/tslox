import NativeFunction from "./NativeFunction";
import LoxNumber from "./LoxNumber";
import LoxValue from "./LoxValue";
import { loxFalse, loxTrue } from "./LoxBool";
import LoxClass from "./LoxClass";
import { nil, LoxNil } from "./LoxNil";
import { isTruthy } from "./coreSemantics";
import LoxString from "./LoxString";

export const clock = new NativeFunction(
    () => new LoxNumber(Date.now() / 1000),
);

export const isInstance = new NativeFunction(
    (value: LoxValue, loxClass: LoxValue) => {
        if (loxClass.type !== "CLASS") return loxFalse;

        let currentClass: LoxClass | null = value.loxClass;

        while (currentClass) {
            if (currentClass === loxClass) return loxTrue;
            currentClass = currentClass.superclass;
        }

        return loxFalse;
    },
);

export const type = new NativeFunction(
    (value: LoxValue) => value.loxClass ?? nil,
);

const nilMethods = {
    init(): LoxValue {
        return nil;
    },
};

export const Nil = new LoxClass(
    "Nil",
    new Map(
        Object.entries(nilMethods)
            .map(([name, func]) => [name, new NativeFunction(func)]),
    ),
);


const boolMethods = {
    init(value: LoxValue): LoxValue {
        return isTruthy(value) ? loxTrue : loxFalse;
    },
};

export const Boolean = new LoxClass(
    "Boolean",
    new Map(
        Object.entries(boolMethods)
            .map(([name, func]) => [name, new NativeFunction(func)]),
    ),
);

const numberMethods = {
    init(value: LoxValue): LoxValue {
        if (value.type === "NUMBER") return value;

        if (value.type !== "STRING") {
            const className = value.loxClass.name;
            throw Error(`Unable to convert type '${className}' to a number.`);
        }

        const parsedValue = +(value as LoxString).value;

        if (isNaN(parsedValue)) {
            throw Error("Invalid number.");
        }

        return new LoxNumber(parsedValue);
    },
};

export const Number = new LoxClass(
    "Number",
    new Map(
        Object.entries(numberMethods)
            .map(([name, func]) => [name, new NativeFunction(func)]),
    ),
);

const stringMethods = {
    init(value: LoxValue): LoxValue {
        return new LoxString(value.toString());
    },
};

export const String = new LoxClass(
    "String",
    new Map(
        Object.entries(stringMethods)
            .map(([name, func]) => [name, new NativeFunction(func)]),
    ),
);

const functionMethods = {
    init(): LoxValue {
        // TODO improve error
        throw Error("Cannot instantiate the Function class.");
    },
};

export const Function = new LoxClass(
    "Function",
    new Map(
        Object.entries(functionMethods)
            .map(([name, func]) => [name, new NativeFunction(func)]),
    ),
);

const classMethods = {
    init(): LoxValue {
        // TODO improve error
        throw Error("Cannot instantiate the Class class.");
    },
    getSuperclass(this: LoxClass): LoxClass | LoxNil {
        return this.superclass ?? nil;
    },
};

export const Class = new LoxClass(
    "Class",
    new Map(
        Object.entries(classMethods)
            .map(([name, func]) => [name, new NativeFunction(func)]),
    ),
);
#!/usr/bin/env ts-node

import * as fs from "fs";

interface ClassDefinition {
    baseName: string;
    className: string;
    fields: {
        types: string[];
        name: string;
    }[];
    methods: MethodMaker[];
}

type MethodMaker = (baseName: string, classDef: ClassDefinition) => string;

function main(args: string[]): void {
    if (args.length !== 1) {
        console.error("Usage:npm run generate-ast <output directory>");
        process.exit(1);
    }
    const outputDir = args[0];

    const importMap = new Map([
        ["LoxValue", "../runtime/LoxValue"],
    ]);

    defineAst({
        outputDir,
        baseName: "Expr",
        withSourceRange: true,
        importMap,
        classes: [
            `Array    -> openingBracket: Token,
                         items: Expr[],
                         closingBracket: Token`,
            `Assign   -> name: Token,
                         value: Expr`,
            `Binary   -> left: Expr,
                         operator: Token,
                         right: Expr`,
            `Call     -> callee: Expr,
                         genericArgs: TypeExpr[],
                         args: Expr[],
                         closingParen: Token`,
            `Get      -> object: Expr,
                         name: Token`,
            "Grouping -> expression: Expr",
            `Literal  -> value: LoxValue,
                         token: Token`,
            `Logical  -> left: Expr,
                         operator: Token,
                         right: Expr`,
            `Set      -> object: Expr,
                         name: Token,
                         value: Expr`,
            `Super    -> keyword: Token,
                         method: Token`,
            "This     -> keyword: Token",
            `Unary    -> operator: Token,
                         right: Expr`,
            "Variable -> name: Token",
        ],
    });

    defineAst({
        outputDir,
        baseName: "Stmt",
        importMap,
        classes: [
            "Block      -> statements: Stmt[]",
            `Class      -> name: Token,
                           genericParams: GenericParameter[],
                           superclass: Superclass | null,
                           fields: Field[],
                           methods: FunctionStmt[]`,
            "Expression -> expression: Expr",
            `Function   -> name: Token,
                           genericParams: GenericParameter[],
                           params: Parameter[],
                           returnType: TypeExpr | null,
                           body: Stmt[]`,
            `If         -> condition: Expr,
                           thenBranch: Stmt,
                           elseBranch: Stmt | null`,
            "Print      -> expression: Expr",
            `Return     -> keyword: Token,
                           value: Expr | null`,
            `Type       -> name: Token,
                           genericParams: GenericParameter[],
                           type: TypeExpr`,
            `Var        -> name: Token,
                           type: TypeExpr | null,
                           initializer: Expr | null`,
            `While      -> condition: Expr,
                           body: Stmt`,
        ],
    });

    defineAst({
        outputDir,
        baseName: "TypeExpr",
        withSourceRange: true,
        importMap,
        classes: [
            `Callable   -> fun: Token,
                           genericParams: GenericParameter[],
                           paramTypes: TypeExpr[],
                           closingParen: Token,
                           returnType: TypeExpr | null`,
            `Union      -> left: TypeExpr,
                           operator: Token,
                           right: TypeExpr`,
            "Variable   -> name: Token",
            `Generic    -> name: Token,
                           genericArgs: TypeExpr[],
                           closingBracket: Token`,
        ],
    });
}

function defineAst({ outputDir, baseName, importMap, classes, withSourceRange = false }: {
    outputDir: string;
    baseName: string;
    importMap: Map<string, string>;
    classes: string[];
    withSourceRange?: boolean;
}): void {
    const path = `${outputDir}/${baseName}.ts`;

    const classDefs = classes.map(type => parseClassDefinition(baseName, type));


    const globalEnv = new Set([
        "null",
        baseName,
        ...classDefs.map(({className}) => className),
    ]);

    const importedTypes = new Set(
        classDefs
            .flatMap(({fields}) => fields)
            .flatMap(({types}) => types)
            .flatMap(type => type.match(/\w+/g) || [])
            .filter(identifier => !globalEnv.has(identifier)),
    );

    if (withSourceRange) {
        importedTypes.add("SourceRange");
        classDefs.forEach(({methods}) => methods.push(sourceRange));
    }

    const lines = [
        "// This file is programmatically generated. Do not edit it directly.",
        "",
        ...Array.from(importedTypes)
            .map(type => ({type, location: importMap.get(type) ?? `./${type}`}))
            .map(({type, location}) => `import ${type} from "${location}";`),
        "",
        ...classDefs.flatMap(defineType),
        `export type ${baseName} =`,
        classDefs.map(({className}) => "    " + className).join(" |\n") + ";",
        "",
        `export default ${baseName};`,
        "",
        ...defineVisitor(baseName, classDefs),
        "",
    ];

    fs.writeFileSync(path, lines.join("\n"));
}

function defineType(classDef: ClassDefinition): string[] {
    const {
        baseName,
        className,
        fields,
        methods,
    } = classDef;

    return [
        `export class ${className} {`,

        // Constructor with all fields
        "    constructor(",
        ...fields.map(({types, name}) =>
            `        readonly ${name}: ${types.join(" | ")},`,
        ),
        "    ) {}",
        "",

        // Visitor pattern
        `    accept<R>(visitor: ${baseName}Visitor<R>): R {`,
        `        return visitor.visit${className}(this);`,
        "    }",

        ...methods.map(method => "\n" + method(baseName, classDef)),

        "}",
        "",
    ];
}

function defineVisitor(
    baseName: string,
    classDefs: ClassDefinition[],
): string[] {
    return [
        `export interface ${baseName}Visitor<R> {`,
        ...classDefs.map(({className}) => {
            const method = `visit${className}`;
            const parameter = baseName[0].toLowerCase() + baseName.slice(1);
            return `    ${method}(${parameter}: ${className}): R;`;
        }),
        "}",
    ];
}

function parseClassDefinition(
    baseName: string,
    definition: string,
): ClassDefinition {
    const [classPrefix, fieldList] = definition.split("->").map(s => s.trim());
    const className = classPrefix + baseName;
    const fields = fieldList.split(",").map(field => {
        const [name, typeList] = field.split(":").map(s => s.trim());
        return {name, types: typeList.split("|").map(s => s.trim())};
    });

    return {baseName, className, fields, methods: []};
}

function sourceRange(baseName: string, {fields}: ClassDefinition): string {
    const typesWithSourceRange = new Set(["TypeExpr", "Expr", "Token"]);
    const fieldsWithSourceRange =
        fields.filter(f => typesWithSourceRange.has(f.types[0]));

    const firstNonNullableFieldIndex =
        fieldsWithSourceRange.findIndex(f => !f.types.includes("null"));
    const startingFields =
        fieldsWithSourceRange.slice(0, firstNonNullableFieldIndex + 1);

    fieldsWithSourceRange.reverse();

    const lastNonNullableFieldIndex =
        fieldsWithSourceRange.findIndex(f => !f.types.includes("null"));
    const endingFields =
        fieldsWithSourceRange.slice(0, lastNonNullableFieldIndex + 1);

    const firstField = startingFields.map(f => `this.${f.name}`).join(" ?? ");
    const lastField = endingFields.map(f => `this.${f.name}`).join(" ?? ");

    return [
        "    sourceRange(): SourceRange {",
        `        const start = (${firstField}).sourceRange().start;`,
        `        const end = (${lastField}).sourceRange().end;`,
        "        return new SourceRange(start, end);",
        "    }",
    ].join("\n");
}

main(process.argv.slice(2));

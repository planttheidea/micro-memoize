import type { Memoized } from "./internalTypes.ts";

type TypeOf =
  | "bigint"
  | "boolean"
  | "function"
  | "number"
  | "object"
  | "string"
  | "symbol"
  | "undefined";

export function getDefault<Value>(
  type: TypeOf,
  value: Value,
  defaultValue?: undefined
): Value | undefined;
export function getDefault<Value, DefaultValue>(
  type: TypeOf,
  value: Value,
  defaultValue: DefaultValue
): Value extends undefined ? DefaultValue : Value;
export function getDefault<Value, DefaultValue>(
  type: TypeOf,
  value: Value,
  defaultValue?: DefaultValue
) {
  return typeof value === type ? value : defaultValue;
}

export function isMemoized(fn: any): fn is Memoized<any, any> {
  return typeof fn === "function" && fn.isMemoized;
}

export function isSameValueZero(a: any, b: any) {
  return a === b || (a !== a && b !== b);
}

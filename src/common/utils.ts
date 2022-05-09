import {BigNumber} from "bignumber.js";

/**
 * Created by IntelliJ IDEA.
 * Author: @cryptoz
 * Date: 6/25/2019
 * Time: 10:20 AM
 */

// Content with ID
export type WithId<C, K> = C & { id: K };

// Omit a field from type
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Compare two arrays
export function arrayEqual<T>(a: T[], b: T[]): boolean {
    return a.every(e => b.includes(e)) && b.every(e => a.includes(e));
}

// Check empty string
export function isEmpty(s: string) {
    return (!s || s === '');
}

// Convert string to int
export function toInt(s: string, defaultValue: number): number {
    if (isEmpty(s))
        return defaultValue;
    const v = Number(s);
    return isNaN(v) ? defaultValue : Math.floor(v);
}

export function isInstanceOf<T>(o: any, sample: T, strict = false, recursive = true): o is T {
    if (o == null) return false;
    let s = sample as any;
    // If we have primitives we check that they are of the same type and that type is not object
    if (typeof s === typeof o && typeof o != "object") return true;

    //If we have an array, then each of the items in the o array must be of the same type as the item in the sample array
    if (o instanceof Array) {
        // If the sample was not an array then we return false;
        if (!(s instanceof Array)) return false;
        let oneSample = s[0];
        let e: any;
        for (e of o) {
            if (!isInstanceOf(e, oneSample, strict, recursive)) return false;
        }
    } else {
        // We check if all the properties of sample are present on o
        for (let key of Object.getOwnPropertyNames(sample)) {
            if (typeof o[key] !== typeof s[key]) return false;
            if (recursive && typeof s[key] == "object" && !isInstanceOf(o[key], s[key], strict, recursive)) return false;
        }
        // We check that o does not have any extra properties to sample
        if (strict) {
            for (let key of Object.getOwnPropertyNames(o)) {
                if (s[key] == null) return false;
            }
        }
    }

    return true;
}

export function tryCast<T>(o: any, sampleObj: T): T | undefined {
    if (isInstanceOf(o, sampleObj)) {
        const retProps = Object.keys(o);
        return Object.keys(sampleObj).every(e => retProps.includes(e)) ? o : undefined;
    } else
        return;
}

export function tryParse<T>(s: string, sampleObj?: T): T | undefined {
    try {
        const ret = JSON.parse(s);
        return sampleObj ? tryCast(ret, sampleObj) : ret as T;
    } catch (e) {
        console.log(`Parsing json object failed: ${e.toString()}`);
        return;
    }
}

// Object mixing
export function mix<First extends any, Second extends any>(first: First, second: Second): First & Second {
    const result: Partial<First & Second> = {};
    for (const prop in first) {
        if (first.hasOwnProperty(prop)) {
            (result as First)[prop] = first[prop];
        }
    }
    for (const prop in second) {
        if (second.hasOwnProperty(prop)) {
            (result as Second)[prop] = second[prop];
        }
    }
    return result as First & Second;
}

// Exclude field from object
export function omit<T extends any, K extends keyof T>(o: T, key: K): Omit<T, K> {
    const result: Partial<T> = {};
    for (const prop in o) {
        if (o.hasOwnProperty(prop) && prop !== key as string) {
            result[prop] = o[prop];
        }
    }
    return result as Omit<T, K>;
}

const uuid = require('uuid/v1');

export function genUID() {
    return uuid();
}

export function sleep(timeOut: number) {
    return new Promise<boolean>(resolve => {
        setTimeout(() => {
            resolve(true)
        }, timeOut);
    })
}

export const to32BytesHex = (v: any) => "0x" + new BigNumber(v).toString(16).padStart(64, "0");

export function formatNumber(num: string | number, fractalDigits: number): string {
    return Number(num)
        .toFixed(fractalDigits)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

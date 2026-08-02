import { dump, load } from 'js-yaml';

const quotedStringKeys = new Set(['begin_time', 'cookie', 'end_time']);

const collectQuotedValues = (value: unknown, values: Record<string, string[]>): void => {
    if (Array.isArray(value)) {
        value.forEach((item) => collectQuotedValues(item, values));
        return;
    }

    if (typeof value !== 'object' || value === null) {
        return;
    }

    Object.entries(value).forEach(([key, item]) => {
        if (quotedStringKeys.has(key) && typeof item === 'string') {
            values[key].push(item);
        }
        collectQuotedValues(item, values);
    });
};

export const parseYaml = <T>(content: string): T => (load(content) ?? {}) as T;

export const stringifyYaml = (value: unknown): string => {
    const quotedValues: Record<string, string[]> = {
        begin_time: [],
        cookie: [],
        end_time: [],
    };
    collectQuotedValues(value, quotedValues);

    const indexes: Record<string, number> = {
        begin_time: 0,
        cookie: 0,
        end_time: 0,
    };
    const rendered = dump(value, {
        indent: 2,
        lineWidth: -1,
        noCompatMode: true,
        noRefs: true,
        quotingType: '"',
        sortKeys: false,
    });

    return rendered.replace(/^(\s*)(begin_time|cookie|end_time):(\s*).*$/gm, (
        _match: string,
        indent: string,
        key: string,
        spacing: string,
    ) => {
        const item = quotedValues[key][indexes[key]++];
        return `${indent}${key}:${spacing}${JSON.stringify(item ?? '')}`;
    });
};

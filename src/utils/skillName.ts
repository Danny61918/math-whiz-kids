/** Splits "Doubles (e.g. 3+3)" style names into a main label and a smaller example line. */
export function nameParts(name: string): { main: string; example: string } {
    const m = /^(.*?)\s*([（(].*[）)])$/.exec(name);
    return m ? { main: m[1], example: m[2] } : { main: name, example: '' };
}

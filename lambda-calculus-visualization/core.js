function parse(str) {
    let i = 0;

    function consumeWhitespace() {
        while (/\s/.test(str[i])) i++;
    }

    function expect(char) {
        consumeWhitespace();
        if (str[i] === char) {
            i++;
            return;
        }
        throw new Error(`Expected '${char}' at position ${i}`);
    }

    function parseTerm() {
        consumeWhitespace();
        const char = str[i].toUpperCase();
        i++;

        if (char === 'L') {
            expect('(');
            const term = parseTerm();
            expect(')');
            return { type: 'abstraction', term };
        } else if (char === 'A') {
            expect('(');
            const func = parseTerm();
            expect(',');
            const arg = parseTerm();
            expect(')');
            return { type: 'application', func, arg };
        } else if (char === 'V') {
            expect('(');
            let numStr = '';
            while (/\d/.test(str[i])) {
                numStr += str[i];
                i++;
            }
            if (numStr.length === 0) throw new Error(`Expected a number at position ${i}`);
            expect(')');
            return { type: 'variable', index: parseInt(numStr, 10) };
        }
        throw new Error(`Unexpected character '${str[i-1]}' at position ${i-1}`);
    }
    
    const result = parseTerm();
    consumeWhitespace();
    if (i < str.length) {
        throw new Error(`Unexpected trailing characters at position ${i}`);
    }
    return result;
}

function shift(term, amount, cutoff) {
    switch (term.type) {
        case 'abstraction':
            return { type: 'abstraction', term: shift(term.term, amount, cutoff + 1) };
        case 'application':
            return { type: 'application', func: shift(term.func, amount, cutoff), arg: shift(term.arg, amount, cutoff) };
        case 'variable':
            return { type: 'variable', index: term.index >= cutoff ? term.index + amount : term.index };
    }
}

function substitute(term, replacement, depth) {
    switch (term.type) {
        case 'abstraction':
            return { type: 'abstraction', term: substitute(term.term, shift(replacement, 1, 0), depth + 1) };
        case 'application':
            return { type: 'application', func: substitute(term.func, replacement, depth), arg: substitute(term.arg, replacement, depth) };
        case 'variable':
            if (term.index === depth) {
                return shift(replacement, depth, 0);
            }
            return term;
    }
}

function betaReduce(term) {
    if (term.type === 'application') {
        // Try to reduce the function part first
        let result = betaReduce(term.func);
        if (result.reduced) {
            return { reduced: true, term: { type: 'application', func: result.term, arg: term.arg } };
        }
        // Then try to reduce the argument part
        result = betaReduce(term.arg);
        if (result.reduced) {
            return { reduced: true, term: { type: 'application', func: term.func, arg: result.term } };
        }
        // If the function is an abstraction, it's a redex
        if (term.func.type === 'abstraction') {
            const newTerm = substitute(term.func.term, shift(term.arg, 1, 0), 0);
            return { reduced: true, term: shift(newTerm, -1, 0) };
        }
    } else if (term.type === 'abstraction') {
        let result = betaReduce(term.term);
        if (result.reduced) {
            return { reduced: true, term: { type: 'abstraction', term: result.term } };
        }
    }
    return { reduced: false, term: term };
}

// For use in a browser environment with modules
if (typeof window !== 'undefined') {
    window.lambdaCore = { parse, betaReduce };
}
// For use in a Node.js environment (e.g., for future testing)
if (typeof module !== 'undefined') {
    module.exports = { parse, betaReduce, shift, substitute };
}
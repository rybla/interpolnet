function runTests() {
    const { parse, betaReduce } = typeof module !== 'undefined' ? require('./core.js') : window.lambdaCore;

    // --- Parser Tests ---
    assert(deepEqual(parse('L(V(0))'), { type: 'abstraction', term: { type: 'variable', index: 0 } }), 'Parser: Identity function');
    assert(deepEqual(parse('A(L(V(0)), V(0))'), { type: 'application', func: { type: 'abstraction', term: { type: 'variable', index: 0 } }, arg: { type: 'variable', index: 0 } }), 'Parser: Simple application');
    try {
        parse('L(V(0)');
        assert(false, 'Parser: Should throw on missing parenthesis');
    } catch (e) {
        assert(true, 'Parser: Throws on missing parenthesis');
    }

    // --- Reduction Tests ---
    function reduceFully(term) {
        let current = term;
        for (let i = 0; i < 100; i++) { // Max 100 reductions to prevent infinite loops
            const result = betaReduce(current);
            if (result.reduced) {
                current = result.term;
            } else {
                break;
            }
        }
        return current;
    }

    // Identity
    const identity = parse('L(V(0))');
    const identityTest = reduceFully(parse('A(L(V(0)), L(V(0)))'));
    assert(deepEqual(identityTest, identity), 'Reduction: Identity application');
    
    // Self-Apply (Omega)
    const omega = parse('A(L(A(V(0),V(0))),L(A(V(0),V(0))))');
    const omegaReduced = betaReduce(omega);
    assert(deepEqual(omegaReduced.term, omega), 'Reduction: Omega combinator reduces to itself in one step');

    // Y-Combinator
    const yCombinator = parse('L(A(L(A(V(1),A(V(0),V(0)))),L(A(V(1),A(V(0),V(0))))))');
    const yCombinatorTest = parse('A(L(V(0)), L(A(L(A(V(1),A(V(0),V(0)))),L(A(V(1),A(V(0),V(0)))))))');
    const yCombinatorReduced = betaReduce(yCombinatorTest);
    assert(yCombinatorReduced.reduced, 'Reduction: Y-Combinator applied to a term should reduce');
    
    // Booleans
    const trueTerm = parse('L(L(V(1)))');
    const falseTerm = parse('L(L(V(0)))');
    const ifThenElse = (p, a, b) => parse(`A(A(${p}, ${a}), ${b})`);

    assert(deepEqual(reduceFully(ifThenElse('L(L(V(1)))', 'L(V(0))', 'L(L(V(0)))')), parse('L(V(0))')), 'Reduction: (IF TRUE) works');
    assert(deepEqual(reduceFully(ifThenElse('L(L(V(0)))', 'L(V(0))', 'L(L(V(0)))')), parse('L(L(V(0)))')), 'Reduction: (IF FALSE) works');

    const and = parse('L(L(A(A(V(1),V(0)),L(L(V(0))))))');
    assert(deepEqual(reduceFully(parse('A(A(L(L(A(A(V(1),V(0)),L(L(V(0)))))), L(L(V(1)))), L(L(V(1))))')), trueTerm), 'Reduction: (AND TRUE TRUE) is TRUE');
    assert(deepEqual(reduceFully(parse('A(A(L(L(A(A(V(1),V(0)),L(L(V(0)))))), L(L(V(1)))), L(L(V(0))))')), falseTerm), 'Reduction: (AND TRUE FALSE) is FALSE');

    const or = parse('L(L(A(A(V(1),L(L(V(1)))),V(0)))))');
    assert(deepEqual(reduceFully(parse('A(A(L(L(A(A(V(1),L(L(V(1)))),V(0))))), L(L(V(1)))), L(L(V(0))))')), trueTerm), 'Reduction: (OR TRUE FALSE) is TRUE');
    assert(deepEqual(reduceFully(parse('A(A(L(L(A(A(V(1),L(L(V(1)))),V(0))))), L(L(V(0)))), L(L(V(0))))')), falseTerm), 'Reduction: (OR FALSE FALSE) is FALSE');

    // Church Numerals
    const zero = parse('L(L(V(0)))');
    const one = parse('L(L(A(V(1),V(0))))');
    const two = parse('L(L(A(V(1),A(V(1),V(0)))))');
    const successor = parse('L(L(L(A(V(1),A(A(V(2),V(1)),V(0))))))');
    
    assert(deepEqual(reduceFully(parse('A(L(L(L(A(V(1),A(A(V(2),V(1)),V(0)))))), L(L(V(0)))))')), one), 'Reduction: (SUCCESSOR 0) is 1');
    assert(deepEqual(reduceFully(parse('A(L(L(L(A(V(1),A(A(V(2),V(1)),V(0)))))), L(L(A(V(1),V(0))))))')), two), 'Reduction: (SUCCESSOR 1) is 2');
}
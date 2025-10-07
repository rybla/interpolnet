class Term {
  constructor() {
    if (new.target === Term) {
      throw new TypeError("Cannot construct Term instances directly");
    }
  }
}

class Variable extends Term {
  constructor(index) {
    super();
    this.index = index;
  }

  toString() {
    return this.index.toString();
  }
}

class Abstraction extends Term {
  constructor(body) {
    super();
    this.body = body;
  }

  toString() {
    return `(λ.${this.body.toString()})`;
  }
}

class Application extends Term {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  toString() {
    return `(${this.left.toString()} ${this.right.toString()})`;
  }
}

function parseExpr(tokens) {
    if (tokens.length === 0 || tokens[0] === ')') {
        return null;
    }

    const terms = [];
    while (tokens.length > 0 && tokens[0] !== ')') {
        terms.push(parseTerm(tokens));
    }

    if (terms.length === 0) {
        return null;
    };

    let current = terms[0];
    for (let i = 1; i < terms.length; i++) {
        current = new Application(current, terms[i]);
    }
    return current;
}

function parseTerm(tokens) {
    if (tokens.length === 0) {
        throw new Error("Unexpected end of expression");
    }
    const token = tokens.shift();

    if (token === 'L' || token === 'λ') {
        return new Abstraction(parseTerm(tokens));
    } else if (token === '(') {
        const expr = parseExpr(tokens);
        if (tokens.shift() !== ')') {
            throw new Error("Mismatched parentheses in expression");
        }
        return expr;
    } else if (!isNaN(parseInt(token, 10))) {
        return new Variable(parseInt(token, 10));
    } else if (token === ')') {
        throw new Error("Unexpected ')'");
    } else {
        throw new Error(`Invalid token: ${token}`);
    }
}

function tokenize(str) {
  return str.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/);
}

function parseLambda(str) {
  const tokens = tokenize(str);
  const term = parseTerm(tokens);
  if (tokens.length > 0) {
    throw new Error("Extra tokens at the end of expression. Mismatched parentheses?");
  }
  return term;
}

function shift(term, by, cutoff = 0) {
  if (term instanceof Variable) {
    return new Variable(term.index >= cutoff ? term.index + by : term.index);
  } else if (term instanceof Abstraction) {
    return new Abstraction(shift(term.body, by, cutoff + 1));
  } else if (term instanceof Application) {
    return new Application(shift(term.left, by, cutoff), shift(term.right, by, cutoff));
  }
  return term;
}

function substitute(term, replacement, cutoff = 0) {
  if (term instanceof Variable) {
    return term.index === cutoff ? shift(replacement, cutoff) : term;
  } else if (term instanceof Abstraction) {
    return new Abstraction(substitute(term.body, replacement, cutoff + 1));
  } else if (term instanceof Application) {
    return new Application(
      substitute(term.left, replacement, cutoff),
      substitute(term.right, replacement, cutoff)
    );
  }
  return term;
}

function betaReduce(term) {
  if (term instanceof Application) {
    if (term.left instanceof Abstraction) {
      // This is a redex: (λ.t1) t2
      // Substitute t2 into t1, shifting appropriately
      let result = substitute(term.left.body, term.right);
      // Decrement free variables in the result
      return shift(result, -1);
    }
    // Reduce left side if possible
    const reducedLeft = betaReduce(term.left);
    if (reducedLeft !== term.left) {
      return new Application(reducedLeft, term.right);
    }
    // Otherwise, reduce right side
    const reducedRight = betaReduce(term.right);
    return new Application(term.left, reducedRight);

  } else if (term instanceof Abstraction) {
    // Reduce inside the abstraction
    const reducedBody = betaReduce(term.body);
    return new Abstraction(reducedBody);
  }
  // Variables and other cases don't reduce
  return term;
}

const exampleTerms = {
  "Identity": "L 0",
  "Self-Application": "L (0 0)",
  "Apply": "L L (1 0)",
  "Church Numeral 0": "L L 0",
  "Church Numeral 1": "L L (1 0)",
  "Church Numeral 2": "L L (1 (1 0))",
  "Successor": "L L L (1 (2 1 0))",
  "Addition": "L L L L ((0 2) ((1 2) 3))",
  "Multiplication": "L L L (0 (1 2))",
  "Omega Combinator": "( (L (0 0)) (L (0 0)) )",
  "Y Combinator": "L ( (L (1 (0 0))) (L (1 (0 0))) )",
};

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const stepButton = document.getElementById('step-button');
    const lambdaInput = document.getElementById('lambda-input');
    const exampleTermsSelect = document.getElementById('example-terms');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size correctly
    const canvasContainer = document.querySelector('.simulation-container');
    canvas.width = canvasContainer.clientWidth - 32; // padding
    canvas.height = 500;


    let animationFrameId = null;
    let currentTerm = null;
    let isPaused = true;
    let previousLayout = null;
    let animationStartTime = 0;
    const animationDuration = 500; // ms

    function populateExamples() {
        for (const name in exampleTerms) {
            const option = document.createElement('option');
            option.value = exampleTerms[name];
            option.textContent = name;
            exampleTermsSelect.appendChild(option);
        }
    }

    exampleTermsSelect.addEventListener('change', (event) => {
        if (event.target.value) {
            lambdaInput.value = event.target.value;
            resetSimulation();
        }
    });

    function draw(interpolation = 1) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (currentTerm) {
            const newLayout = calculateLayout(currentTerm);
            let layoutToDraw = newLayout;
            if (previousLayout && interpolation < 1) {
                layoutToDraw = interpolateLayouts(previousLayout, newLayout, interpolation);
            }

            const padding = 40;
            const scaleX = (canvas.width - padding * 2) / layoutToDraw.width;
            const scaleY = (canvas.height - padding * 2) / layoutToDraw.height;
            const scale = Math.min(scaleX, scaleY, 2); // Cap scaling at 2x

            const scaledWidth = layoutToDraw.width * scale;
            const scaledHeight = layoutToDraw.height * scale;

            const offsetX = (canvas.width - scaledWidth) / 2;
            const offsetY = (canvas.height - scaledHeight) / 2;

            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);
            
            drawTerm(currentTerm, 0, 0, layoutToDraw);

            ctx.restore();
        }
    }

    function interpolateLayouts(layout1, layout2, alpha) {
        if (!layout1 || !layout2) return layout2;

        const interpolated = { ...layout2 };
        interpolated.x = layout1.x + (layout2.x - layout1.x) * alpha;
        interpolated.y = layout1.y + (layout2.y - layout1.y) * alpha;
        interpolated.width = layout1.width + (layout2.width - layout1.width) * alpha;
        interpolated.height = layout1.height + (layout2.height - layout1.height) * alpha;

        if (layout2.body) {
            interpolated.body = interpolateLayouts(layout1.body, layout2.body, alpha);
        }
        if (layout2.left) {
            interpolated.left = interpolateLayouts(layout1.left, layout2.left, alpha);
        }
        if (layout2.right) {
            interpolated.right = interpolateLayouts(layout1.right, layout2.right, alpha);
        }

        return interpolated;
    }


    function calculateLayout(term) {
        if (term instanceof Variable) {
            return { width: 30, height: 40, x: 0, y: 0 };
        } else if (term instanceof Abstraction) {
            const bodyLayout = calculateLayout(term.body);
            return {
                width: 50 + bodyLayout.width,
                height: Math.max(60, bodyLayout.height),
                x: 0,
                y: 0,
                body: bodyLayout
            };
        } else if (term instanceof Application) {
            const leftLayout = calculateLayout(term.left);
            const rightLayout = calculateLayout(term.right);
            const height = 40 + Math.max(leftLayout.height, rightLayout.height);
            const width = leftLayout.width + rightLayout.width + 40;
            return {
                width: width,
                height: height,
                x: 0,
                y: 0,
                left: leftLayout,
                right: rightLayout
            };
        }
        return { width: 0, height: 0, x: 0, y: 0 };
    }

    function drawTerm(term, x, y, layout, depth = 0) {
        const colors = ['#00aaff', '#ff00aa', '#aaff00', '#ffaa00', '#00ffaa', '#aa00ff'];
        const color = colors[depth % colors.length];
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (term instanceof Variable) {
            ctx.font = '20px Courier New';
            ctx.fillText(term.index, x + layout.width / 2 - 5, y + layout.height / 2 + 5);
        } else if (term instanceof Abstraction) {
            ctx.font = '30px Courier New';
            ctx.fillText('λ', x + 15, y + 35);
            ctx.beginPath();
            ctx.roundRect(x, y, layout.width, layout.height, [15]);
            ctx.stroke();
            drawTerm(term.body, x + 50, y + (layout.height - layout.body.height) / 2, layout.body, depth + 1);
        } else if (term instanceof Application) {
            const leftX = x;
            const rightX = x + layout.left.width + 40;
            const childY = y + 40;

            // Draw connecting lines
            ctx.beginPath();
            ctx.moveTo(x + layout.width / 2, y + 10);
            ctx.lineTo(leftX + layout.left.width / 2, childY);
            ctx.moveTo(x + layout.width / 2, y + 10);
            ctx.lineTo(rightX + layout.right.width / 2, childY);
            ctx.stroke();

            // Draw a small circle for the application node
            ctx.beginPath();
            ctx.arc(x + layout.width / 2, y + 10, 5, 0, 2 * Math.PI);
            ctx.fill();

            drawTerm(term.left, leftX, childY, layout.left, depth + 1);
            drawTerm(term.right, rightX, childY, layout.right, depth + 1);
        }
    }

    function step() {
        if (currentTerm) {
            previousLayout = calculateLayout(currentTerm);
            const nextTerm = betaReduce(currentTerm);
            if (nextTerm.toString() !== currentTerm.toString()) {
                currentTerm = nextTerm;
                animationStartTime = performance.now();
                animate();
            } else {
                // No more reductions
                pause();
            }
        }
    }

    function animate() {
        const now = performance.now();
        const elapsed = now - animationStartTime;
        const interpolation = Math.min(elapsed / animationDuration, 1);

        draw(interpolation);

        if (interpolation < 1) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            previousLayout = null;
            if(!isPaused) {
                setTimeout(step, 500); // delay before next step
            }
        }
    }

    function start() {
        if (isPaused) {
            isPaused = false;
            step();
        }
    }

    function pause() {
        isPaused = true;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    function resetSimulation() {
        pause();
        try {
            currentTerm = parseLambda(lambdaInput.value);
            previousLayout = null;
        } catch (e) {
            alert(`Parsing Error: ${e.message}`);
            currentTerm = null;
        }
        draw();
    }

    startButton.addEventListener('click', start);
    pauseButton.addEventListener('click', pause);
    stepButton.addEventListener('click', () => {
        if (isPaused) {
            step();
        }
    });
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    lambdaInput.addEventListener('input', debounce(resetSimulation, 500));

    populateExamples();
    resetSimulation();
});
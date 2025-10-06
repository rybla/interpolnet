document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('fractal-canvas');
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
        alert('WebGL not supported');
        return;
    }

    const fractalSelect = document.getElementById('fractal-select');
    const depthSlider = document.getElementById('depth-slider');
    const speedSlider = document.getElementById('speed-slider');

    let currentFractal = fractalSelect.value;
    let depth = depthSlider.value;
    let speed = speedSlider.value;
    let animationFrameId = null;

    // --- Shader Compilation and Program Linking ---
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
        console.error(`Error compiling shader: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
    }

    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
        console.error(`Error linking program: ${gl.getProgramInfoLog(program)}`);
        gl.deleteProgram(program);
    }

    // --- Shader Definitions ---
    const Shaders = {
        passthrough_vs: `attribute vec4 a_position; void main() { gl_Position = a_position; gl_PointSize = 1.0; }`,
        varying_vs: `attribute vec4 a_position; varying vec2 v_position; void main() { gl_Position = a_position; gl_PointSize = 1.0; v_position = a_position.xy; }`,
        gradient_fs: `precision mediump float; varying vec2 v_position; uniform vec3 u_base_color;
                      vec3 hsv2rgb(vec3 c) {
                          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
                      }
                      void main() {
                          float hue = u_base_color.x + 0.3 * (v_position.x - v_position.y);
                          gl_FragColor = vec4(hsv2rgb(vec3(hue, u_base_color.y, u_base_color.z)), 1.0);
                      }`,
        mandelbrot_fs: `precision highp float; uniform vec2 u_resolution; uniform float u_iter;
                        vec3 hsv2rgb(vec3 c) { vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0); vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); return c.z * mix(K.xxx, clamp(p-K.xxx, 0.0, 1.0), c.y); }
                        float mandelbrot(vec2 c, float max_iter) {
                            vec2 z = vec2(0.0);
                            for (int i = 0; i < 2000; i++) {
                                if (float(i) > max_iter) break;
                                z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
                                if (dot(z, z) > 4.0) return float(i) / max_iter;
                            }
                            return 0.0;
                        }
                        void main() {
                            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
                            uv = uv * 2.0 - vec2(1.0, 0.0);
                            float m = mandelbrot(uv, u_iter);
                            vec3 col = vec3(0.0);
                            if (m > 0.0) {
                                col = hsv2rgb(vec3(m * 2.0, 0.8, 0.9));
                                vec2 d = vec2(1.0/u_resolution.y, 0.0);
                                float nx = mandelbrot(uv+d.xy, u_iter) - m;
                                float ny = mandelbrot(uv+d.yx, u_iter) - m;
                                vec3 normal = normalize(vec3(nx, ny, 0.05));
                                vec3 light = normalize(vec3(0.5, 0.5, 0.8));
                                col *= (max(0.0, dot(normal, light)) * 0.5 + 0.5);
                            }
                            gl_FragColor = vec4(col, 1.0);
                        }`,
        julia_fs: `precision highp float; uniform vec2 u_resolution; uniform float u_iter; uniform vec2 u_julia_c;
                   vec3 hsv2rgb(vec3 c) { vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0); vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); return c.z * mix(K.xxx, clamp(p-K.xxx, 0.0, 1.0), c.y); }
                   float julia(vec2 z, float max_iter) {
                       for (int i = 0; i < 2000; i++) {
                           if (float(i) > max_iter) break;
                           z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + u_julia_c;
                           if (dot(z, z) > 4.0) return float(i) / max_iter;
                       }
                       return 0.0;
                   }
                   void main() {
                       vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
                       float j = julia(uv * 2.0, u_iter);
                       vec3 col = vec3(0.0);
                       if (j > 0.0) {
                           col = hsv2rgb(vec3(j, 0.8, 0.9));
                           vec2 d = vec2(1.0/u_resolution.y, 0.0);
                           float nx = julia(uv*2.0+d.xy, u_iter) - j;
                           float ny = julia(uv*2.0+d.yx, u_iter) - j;
                           vec3 normal = normalize(vec3(nx, ny, 0.05));
                           vec3 light = normalize(vec3(0.5, 0.5, 0.8));
                           col *= (max(0.0, dot(normal, light)) * 0.5 + 0.5);
                       }
                       gl_FragColor = vec4(col, 1.0);
                   }`
    };

    // --- Fractal Rendering Logic ---
    const renderers = {
        mandelbrot: new AnimatedShaderRenderer(Shaders.mandelbrot_fs, (program) => {
            gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), gl.canvas.width, gl.canvas.height);
        }),
        julia: new AnimatedShaderRenderer(Shaders.julia_fs, (program) => {
            gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), gl.canvas.width, gl.canvas.height);
            gl.uniform2f(gl.getUniformLocation(program, 'u_julia_c'), -0.7, 0.27015);
        }),
        fern: new AnimatedVertexRenderer(0.3, 'POINTS', (depth) => {
            let x = 0, y = 0;
            const points = new Float32Array(parseInt(depth) * 5000 * 2);
            for (let i = 0; i < points.length / 2; i++) {
                points[i*2] = x / 2.7 - 0.3;
                points[i*2+1] = y / 10.0 * 1.8 - 0.9;
                const r = Math.random();
                let nextX, nextY;
                if (r < 0.01) { nextX = 0; nextY = 0.16 * y; }
                else if (r < 0.86) { nextX = 0.85 * x + 0.04 * y; nextY = -0.04 * x + 0.85 * y + 1.6; }
                else if (r < 0.93) { nextX = 0.2 * x - 0.26 * y; nextY = 0.23 * x + 0.22 * y + 1.6; }
                else { nextX = -0.15 * x + 0.28 * y; nextY = 0.26 * x + 0.24 * y + 0.44; }
                x = nextX; y = nextY;
            }
            return points;
        }),
        sierpinski: new AnimatedVertexRenderer(0.0, 'TRIANGLES', (depth) => {
            const vertices = [];
            const p1 = {x:0, y:0.9}, p2 = {x:-0.9, y:-0.9}, p3 = {x:0.9, y:-0.9};
            function generate(p1, p2, p3, level) {
                if (level == 0) { vertices.push(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y); return; }
                const m12 = {x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2};
                const m23 = {x:(p2.x+p3.x)/2, y:(p2.y+p3.y)/2};
                const m31 = {x:(p3.x+p1.x)/2, y:(p3.y+p1.y)/2};
                generate(p1, m12, m31, level-1);
                generate(m12, p2, m23, level-1);
                generate(m31, m23, p3, level-1);
            }
            generate(p1, p2, p3, parseInt(depth));
            return new Float32Array(vertices);
        }),
        koch: new AnimatedVertexRenderer(0.6, 'LINES', (depth) => {
            const vertices = [];
            const size = 1.5, h = size*Math.sqrt(3)/2;
            const p1={x:-size/2,y:-h/3}, p2={x:size/2,y:-h/3}, p3={x:0,y:h*2/3};
            function generate(p1, p2, level) {
                if (level == 0) { vertices.push(p1.x,p1.y, p2.x,p2.y); return; }
                const dx=p2.x-p1.x, dy=p2.y-p1.y;
                const pa={x:p1.x+dx/3, y:p1.y+dy/3};
                const pb={x:p1.x+2*dx/3, y:p1.y+2*dy/3};
                const pc={x:pa.x+dx/6-dy*Math.sqrt(3)/6, y:pa.y+dy/6+dx*Math.sqrt(3)/6};
                generate(p1, pa, level-1); generate(pa, pc, level-1);
                generate(pc, pb, level-1); generate(pb, p2, level-1);
            }
            generate(p1, p2, parseInt(depth)); generate(p2, p3, parseInt(depth)); generate(p3, p1, parseInt(depth));
            return new Float32Array(vertices);
        }),
        dragon: new AnimatedVertexRenderer(0.8, 'LINE_STRIP', (depth) => {
            let path = [1];
            for (let i=0; i<parseInt(depth); i++) {
                const rev = [...path].reverse();
                path.push(1);
                for (const turn of rev) { path.push(-turn); }
            }
            const vertices = [];
            let x=0, y=0, angle=0;
            vertices.push(x,y);
            for (const turn of path) {
                angle += turn * Math.PI / 2;
                x += Math.cos(angle); y += Math.sin(angle);
                vertices.push(x,y);
            }
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (let i=0; i<vertices.length; i+=2) {
                minX = Math.min(minX, vertices[i]); maxX = Math.max(maxX, vertices[i]);
                minY = Math.min(minY, vertices[i+1]); maxY = Math.max(maxY, vertices[i+1]);
            }
            const scale = 2.0 / Math.max(maxX-minX, maxY-minY) * 0.9;
            const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
            const norm = [];
            for (let i=0; i<vertices.length; i+=2) {
                norm.push((vertices[i]-cx)*scale, (vertices[i+1]-cy)*scale);
            }
            return new Float32Array(norm);
        })
    };

    function drawFractal() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.95, 0.97, 0.98, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const renderer = renderers[currentFractal];
        if (renderer) {
            renderer.render(depth, speed);
        }
    }

    function AnimatedShaderRenderer(fsSource, setUniforms) {
        const program = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, Shaders.passthrough_vs), createShader(gl, gl.FRAGMENT_SHADER, fsSource));
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        const iterLoc = gl.getUniformLocation(program, "u_iter");

        this.render = (depth, speed) => {
            let currentIter = 0;
            const maxIter = parseInt(depth) * 50;
            
            function animate() {
                currentIter += speed * 2;
                if (currentIter > maxIter) currentIter = maxIter;
                
                gl.useProgram(program);
                const posLoc = gl.getAttribLocation(program, 'a_position');
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                setUniforms(program);
                gl.uniform1f(iterLoc, currentIter);
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                if (currentIter < maxIter) {
                    animationFrameId = requestAnimationFrame(animate);
                }
            }
            animate();
        };
    }

    function AnimatedVertexRenderer(hue, primitive, vertexGenerator) {
        const program = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, Shaders.varying_vs), createShader(gl, gl.FRAGMENT_SHADER, Shaders.gradient_fs));
        const positionBuffer = gl.createBuffer();
        const colorLoc = gl.getUniformLocation(program, "u_base_color");

        this.render = (depth, speed) => {
            const vertices = vertexGenerator(depth);
            const totalVertices = vertices.length / 2;
            let drawnVertices = 0;

            function animate() {
                drawnVertices += Math.ceil(totalVertices / (100 / speed));
                if (drawnVertices > totalVertices) drawnVertices = totalVertices;
                
                gl.useProgram(program);
                const posLoc = gl.getAttribLocation(program, 'a_position');
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                gl.uniform3f(colorLoc, hue, 0.8, 0.9);
                gl.drawArrays(gl[primitive], 0, drawnVertices);

                if (drawnVertices < totalVertices) {
                    animationFrameId = requestAnimationFrame(animate);
                }
            }
            animate();
        };
    }

    // --- Event Listeners ---
    fractalSelect.addEventListener('change', (e) => { currentFractal = e.target.value; drawFractal(); });
    depthSlider.addEventListener('input', (e) => { depth = e.target.value; drawFractal(); });
    speedSlider.addEventListener('input', (e) => { speed = e.target.value; drawFractal(); });

    drawFractal();
});
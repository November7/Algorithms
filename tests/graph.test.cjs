// Run with: node --test tests/graph.test.cjs
// Exercise the actual inline script without adding a browser dependency.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const html = readFileSync(join(__dirname, '..', 'graph.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function createLab() {
  const elements = new Map(), buttons = [], frames = new Map();
  let frameId = 0, seed = 42;
  function element() {
    return {
      value: '', textContent: '', children: [], dataset: {}, disabled: false,
      classList: { toggle() {} }, listeners: {},
      addEventListener(name, handler) { this.listeners[name] = handler; },
      setAttribute() {}, removeAttribute() {},
      replaceChildren(...children) { this.children = []; this.append(...children); },
      append(...children) { children.forEach(child => { child.parentElement = this; this.children.push(child); }); },
      getBoundingClientRect() { return { width: 800, height: 460 }; }
    };
  }
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) elements.set(match[1], element());
  const $ = id => elements.get(id);
  Object.entries({ size: '12', density: '15', speed: '5', dataset: 'connected', scope: 'reachable' }).forEach(([id, value]) => { $(id).value = value; });
  $('board').getContext = () => new Proxy({}, { get: () => () => {} });
  $('board').parentElement = element();
  const document = {
    hidden: false, documentElement: { clientWidth: 1440 }, listeners: {},
    getElementById: $, createElement() { const node = element(); buttons.push(node); return node; },
    querySelectorAll() { return buttons.filter(node => node.className === 'algorithm-pick'); },
    addEventListener(name, handler) { this.listeners[name] = handler; }
  };
  const seededMath = Object.create(Math);
  seededMath.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  const context = vm.createContext({
    document, window: { devicePixelRatio: 1, addEventListener() {} }, Math: seededMath,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    ResizeObserver: class { observe() {} }, setTimeout, clearTimeout,
  });
  // Export lexical internals only in the test copy of the script.
  vm.runInContext(script.replace('  generateGraph(); renderLesson(); resizeCanvas();',
    '  globalThis.lab = { state, generateGraph, resetTraversal, begin, nextStep, togglePause };\n  generateGraph(); renderLesson(); resizeCanvas();'), context);
  const lab = context.lab;
  function tick(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); }
  function click(id) { assert.equal($(id).disabled, false, `${id} should be enabled`); $(id).listeners.click(); }
  return { ...lab, $, document, tick, click, pick(key) { buttons.find(node => node.dataset.algorithm === key).listeners.click(); } };
}
const plain = value => JSON.parse(JSON.stringify(value));

function setGraph(lab, adjacency, start = 0, scope = 'reachable') {
  lab.state.adjacency = adjacency;
  lab.state.edges = adjacency.flatMap((neighbors, a) => neighbors.filter(b => b > a).map(b => [a, b]));
  lab.$('startVertex').value = String(start); lab.$('scope').value = scope; lab.resetTraversal();
}
function run(lab, algorithm) {
  lab.state.selected = algorithm; lab.begin(true);
  let operations = 0;
  while (lab.state.running) {
    lab.nextStep();
    assert.ok(++operations < 10000, 'Traversal must terminate');
    assert.equal(new Set(lab.state.order).size, lab.state.order.length, 'Discover each vertex once');
    assert.equal(new Set(lab.state.frontier).size, lab.state.frontier.length, 'No duplicate frontier entries');
    if (algorithm === 'dfs') {
      lab.state.frontier.slice(1).forEach((v, i) => assert.equal(lab.state.parent[v], lab.state.frontier[i], 'DFS stack is the active parent path'));
    }
  }
}
function reference(adjacency, start, all, dfs) {
  const order = [], parent = adjacency.map(() => -1), depth = adjacency.map(() => null);
  let components = 0;
  function visit(v, p) { parent[v] = p; depth[v] = p < 0 ? 0 : depth[p] + 1; order.push(v); }
  function walk(v, p) { visit(v, p); for (const next of adjacency[v]) if (depth[next] === null) walk(next, v); }
  for (const root of [start, ...adjacency.map((_, i) => i).filter(i => i !== start)]) {
    if (depth[root] !== null) continue;
    components++;
    if (dfs) walk(root, -1);
    else {
      visit(root, -1); const pending = [root];
      while (pending.length) {
        const v = pending.shift();
        for (const next of adjacency[v]) if (depth[next] === null) { visit(next, v); pending.push(next); }
      }
    }
    if (!all) break;
  }
  return { order, parent, depth, components };
}

test('BFS uses shortest distances; DFS matches recursive preorder on a cyclic graph', () => {
  const lab = createLab();
  // 0-1-2-3 and shortcut 0-3 distinguish BFS distance from DFS depth.
  setGraph(lab, [[1, 3], [0, 2], [1, 3], [0, 2]]);
  run(lab, 'bfs');
  assert.deepEqual(plain(lab.state.order), [0, 1, 3, 2]);
  assert.deepEqual(plain(lab.state.depth), [0, 1, 2, 1]);
  assert.equal(lab.state.peak, 2);
  run(lab, 'dfs');
  assert.deepEqual(plain(lab.state.order), [0, 1, 2, 3]);
  assert.deepEqual(plain(lab.state.depth), [0, 1, 2, 3]);
  assert.equal(lab.state.peak, 4);
  assert.equal(lab.state.checks, 8);
});

test('Disconnected graphs, isolated starts and whole-graph traversal', () => {
  const lab = createLab();
  for (const algorithm of ['bfs', 'dfs']) {
    setGraph(lab, [[1], [0], [], [4], [3]], 2);
    run(lab, algorithm);
    assert.deepEqual(plain(lab.state.order), [2]);
    assert.equal(lab.state.checks, 0);
    assert.match(lab.$('operation').textContent, /Nieosiągalne ze startu: 4/);
    lab.$('scope').value = 'all'; run(lab, algorithm);
    assert.deepEqual(plain(lab.state.order), [2, 0, 1, 3, 4]);
    assert.equal(lab.state.components, 3);
    assert.equal(lab.state.treeEdges.size, 2);
    assert.equal(lab.state.checks, 4);
  }
});

test('Random generation and both traversals agree with independent references', () => {
  const lab = createLab();
  for (const n of [4, 12, 24]) for (const kind of ['connected', 'tree', 'disconnected']) for (const density of [0, 15, 60]) {
    lab.$('size').value = n; lab.$('dataset').value = kind; lab.$('density').value = density;
    lab.generateGraph();
    const adjacency = plain(lab.state.adjacency), edges = plain(lab.state.edges);
    assert.equal(adjacency.length, n);
    assert.equal(new Set(edges.map(([a, b]) => [a, b].sort((x, y) => x - y).join('-'))).size, edges.length);
    adjacency.forEach((neighbors, v) => {
      assert.ok(!neighbors.includes(v));
      neighbors.forEach(next => assert.ok(adjacency[next].includes(v)));
      assert.deepEqual(neighbors, [...neighbors].sort((a, b) => a - b));
    });
    assert.equal(reference(adjacency, 0, true, false).components, kind === 'disconnected' ? 2 : 1);
    if (kind === 'tree' || density === 0) assert.equal(edges.length, n - (kind === 'disconnected' ? 2 : 1));
    for (const start of [0, n - 1]) for (const scope of ['reachable', 'all']) for (const algorithm of ['bfs', 'dfs']) {
      lab.$('startVertex').value = String(start); lab.$('scope').value = scope;
      run(lab, algorithm);
      const expected = reference(adjacency, start, scope === 'all', algorithm === 'dfs');
      for (const key of ['order', 'parent', 'depth', 'components']) assert.deepEqual(plain(lab.state[key]), expected[key], `${kind}/${n}/${algorithm}/${key}`);
      assert.equal(lab.state.checks, expected.order.reduce((sum, v) => sum + adjacency[v].length, 0));
      assert.equal(lab.state.treeEdges.size, expected.order.length - expected.components);
      assert.equal(lab.state.frontier.length, 0);
      assert.deepEqual(plain(lab.state.adjacency), adjacency);
    }
  }
});

test('Step, pause, speed, visibility, stop and algorithm switching preserve the graph', () => {
  const lab = createLab(), original = plain(lab.state.adjacency);
  lab.click('stepBtn'); lab.tick(0);
  assert.equal(lab.state.order.length, 1);
  assert.equal(lab.state.paused, true);
  assert.equal(lab.$('randomBtn').disabled, true);
  const order = plain(lab.state.order);
  lab.tick(2000); assert.deepEqual(plain(lab.state.order), order);
  lab.click('pauseBtn'); lab.tick(2010); lab.tick(2110); lab.tick(2210);
  assert.ok(lab.state.active >= 0);
  lab.click('pauseBtn');
  const checks = lab.state.checks;
  lab.tick(5000); assert.equal(lab.state.checks, checks);
  lab.click('stepBtn'); assert.equal(lab.state.checks, checks + 1);
  lab.click('stopBtn'); lab.tick(6000);
  assert.equal(lab.state.running, false); assert.equal(lab.state.order.length, 0);
  assert.deepEqual(plain(lab.state.adjacency), original);
  lab.pick('dfs'); assert.equal(lab.state.selected, 'dfs');
  assert.deepEqual(plain(lab.state.adjacency), original);
  lab.$('speed').value = '30'; lab.$('speed').listeners.input();
  assert.equal(lab.$('speedLabel').textContent, '30 op./s');
  lab.click('startBtn'); lab.tick(7000);
  lab.document.hidden = true; lab.document.listeners.visibilitychange(); lab.tick(9000);
  assert.equal(lab.state.order.length, 0);
  lab.document.hidden = false; lab.document.listeners.visibilitychange(); lab.tick(9100); lab.tick(9200);
  assert.ok(lab.state.order.length > 0);
  lab.click('stopBtn'); lab.$('dataset').value = 'tree'; lab.generateGraph();
  assert.equal(lab.$('density').disabled, true);
});

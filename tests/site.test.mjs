import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function routerHarness() {
  const listeners = {};
  const document = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    getElementById: () => null,
    querySelectorAll: () => []
  };
  const location = { protocol: 'https:', pathname: '/login-me/', hash: '' };
  const history = { pushState: (_state, _title, value) => { location.hash = value; }, replaceState: (_state, _title, value) => { location.hash = value; } };
  const window = { addEventListener() {}, isUserLoggedIn: () => false };
  const context = vm.createContext({ document, window, location, history, URL, Map, Set, console });
  vm.runInContext(app, context);
  return { context, router: window.AppRouter, window, location, listeners };
}

test('static-host routes retain the deployment path and survive refresh', () => {
  const { router, location } = routerHarness();
  router.go('/services');
  assert.equal(location.pathname, '/login-me/');
  assert.equal(location.hash, '#/services');
  assert.equal(router.read(), '/services');
  router.go('/customers');
  assert.equal(router.read(), '/customers');
  location.hash = '#services-section';
  assert.equal(router.read(), '/services');
  location.hash = '#/missing';
  assert.equal(router.read(), '/dashboard');
});

test('tool routes do not pass options as image URLs or chat prompts', () => {
  const { router, window } = routerHarness();
  let args;
  window.openPhotoStudioModal = (...values) => { args = values; };
  router.go('/photo-studio');
  assert.deepEqual(args, []);
  window.openAiChatModal = (...values) => { args = values; };
  router.go('/ai-chat');
  assert.deepEqual(args, []);
});

test('private routes require login and closing the gate returns to a public page', () => {
  const { router, window } = routerHarness();
  let prompted = 0;
  window.openAuthModal = () => { prompted++; };
  for (const route of ['/performance', '/transactions', '/profile', '/reports', '/bill', '/customers/new']) {
    router.go(route);
    assert.equal(router.currentPath, route);
    router.onModalClosed('authModal');
    assert.equal(router.currentPath, '/dashboard');
  }
  assert.equal(prompted, 6);
});

test('chat formatting escapes HTML and rejects executable markup', () => {
  const source = readFileSync(new URL('../ai-chat.js', import.meta.url), 'utf8');
  const formatter = source.slice(source.indexOf('    function formatMarkdown'), source.indexOf('    // --- Event Listeners Initialization'));
  const context = vm.createContext({});
  vm.runInContext(formatter, context);
  const output = context.formatMarkdown('<img src=x onerror=alert(1)> **Safe** [bad](javascript:alert(1))');
  assert(!output.includes('<img'));
  assert(!output.includes('<a'));
  assert(output.includes('&lt;img'));
  assert(output.includes('<strong'));
});

test('chat remains available with corrupt or blocked browser storage', () => {
  const source = readFileSync(new URL('../ai-chat.js', import.meta.url), 'utf8');
  for (const stored of ['{}', '[null]', '[{"id":"chat_1","title":"test","messages":[null]}]', 'invalid']) {
    const window = {};
    const context = vm.createContext({ window, localStorage: { getItem: key => key === 'ai_chat_sessions' ? stored : null, setItem() {} }, document: { addEventListener() {}, getElementById: id => id === 'aiChatModal' ? { classList: { remove() {} }, style: {} } : null }, setTimeout() {} });
    vm.runInContext(source, context);
    assert.equal(typeof window.openAiChatModal, 'function');
    assert.doesNotThrow(() => window.openAiChatModal());
  }
  const context = vm.createContext({ window: {}, localStorage: { getItem() { throw Error('blocked'); } }, document: { addEventListener() {} } });
  assert.doesNotThrow(() => vm.runInContext(source, context));
});

test('PDF export preserves blank pages, content, sizes and existing rotation', async () => {
  const PDFLib = await import('pdf-lib');
  const source = await PDFLib.PDFDocument.create();
  const page = source.addPage([200, 300]);
  page.drawText('Regression fixture');
  page.setRotation(PDFLib.degrees(90));
  source.addPage([250, 350]); // No Contents entry: valid blank page.
  const bytes = await source.save();
  for (const fit of [false, true]) {
    let exported;
    const nodes = new Map();
    const getElementById = id => {
      if (!nodes.has(id)) nodes.set(id, { value: '', checked: id === 'pdf-tools-fit-pdf' && fit, innerHTML: 'Create', className: '', textContent: '' });
      return nodes.get(id);
    };
    const context = vm.createContext({
      window: { pdfjsLib: {}, addEventListener() {}, setTimeout() {} }, Blob, setTimeout, clearTimeout,
      document: { addEventListener() {}, querySelectorAll: () => [], getElementById,
        createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } },
      URL: { createObjectURL(blob) { exported = blob; return 'blob:fixture'; } },
      console, fixtureBytes: bytes
    });
    vm.runInContext(readFileSync(new URL('../node_modules/pdf-lib/dist/pdf-lib.min.js', import.meta.url), 'utf8'), context);
    vm.runInContext('window.PDFLib = PDFLib', context);
    vm.runInContext(app, context);
    vm.runInContext(`pdfToolsSources.set('fixture', { bytes: new Uint8Array(fixtureBytes) });
      pdfToolsItems = [
        { kind: 'pdf', sourceId: 'fixture', pageIndex: 0, rotation: 90, fileName: 'fixture.pdf' },
        { kind: 'pdf', sourceId: 'fixture', pageIndex: 1, rotation: 0, fileName: 'fixture.pdf' }
      ];`, context);
    await vm.runInContext('createPdfFromTools()', context);
    assert(exported, getElementById('pdf-tools-status').textContent);
    const output = await PDFLib.PDFDocument.load(await exported.arrayBuffer());
    assert.equal(output.getPageCount(), 2);
    assert.equal(output.getPage(0).getRotation().angle, fit ? 90 : 180);
    assert.equal(output.getPage(0).getWidth(), fit ? 595.28 : 200);
    assert.equal(output.getPage(1).getHeight(), fit ? 841.89 : 350);
    assert(output.getPage(0).node.Contents(), 'Non-blank page keeps its content');
  }
});

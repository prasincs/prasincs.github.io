# Adding WASM-powered REPLs to Blog Posts

This blog supports embedding interactive WebAssembly REPLs. The infrastructure handles WASM loading with a standard WASI shim, so you just need to point to your `.wasm` file and create a shortcode for the UI.

## Quick Start (Using Existing REPL)

For the Lisp REPL, just add to your post's front matter:

```yaml
wasm: https://nextdoorhacker.com/minilisp-cpp/lisp.wasm
```

Then use the shortcode in your post:

```markdown
{{</* lisp-repl */>}}

<!-- Or with a custom default expression -->
{{</* lisp-repl default="(* 6 7)" */>}}
```

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Front Matter   │────▶│  extend_head.html │────▶│  wasm-loader.js │
│  wasm: <url>    │     │  Sets WASM_URL    │     │  Loads & events │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                   wasm-ready event
                                                          │
                                                          ▼
                                               ┌─────────────────┐
                                               │    Shortcode    │
                                               │  lisp-repl.html │
                                               └─────────────────┘
```

1. **Front matter** sets `wasm: <url>`
2. **extend_head.html** detects this and:
   - Sets `window.WASM_URL = "<url>"`
   - Loads `/js/wasm-loader.js`
3. **wasm-loader.js** fetches the WASM, instantiates it with WASI shim, and dispatches `wasm-ready` event
4. **Shortcode** listens for `wasm-ready` and provides the UI

## Adding a New REPL

### Step 1: Build Your WASM

Compile with wasi-sdk (not Emscripten) for minimal size:

```bash
# Example flags
clang++ -std=c++20 -Os -fno-exceptions \
  -Wl,--no-entry -Wl,--export-dynamic \
  -o interpreter.wasm main.cpp

# Optimize with wasm-opt
wasm-opt -Oz --strip-debug --strip-producers interpreter.wasm -o interpreter.wasm
```

Key requirements:
- Export an `eval` or similar function
- Export `memory`
- Use `-Wl,--no-entry` for library mode

### Step 2: Host the WASM

Upload to `https://nextdoorhacker.com/<project>/interpreter.wasm` or similar.

### Step 3: Create a Shortcode

Create `layouts/shortcodes/<name>-repl.html`:

```html
<div id="my-repl" style="...">
  <input type="text" id="my-input" value="{{ .Get "default" | default "hello" }}">
  <button onclick="evalMyLang()">Eval</button>
  <pre id="my-output">Loading WASM...</pre>
</div>

<script>
(function() {
  const output = document.getElementById('my-output');

  window.addEventListener('wasm-ready', () => {
    output.textContent = 'Ready!';
  });

  window.addEventListener('wasm-error', (e) => {
    output.textContent = 'Failed: ' + e.detail.message;
  });

  // Handle if already loaded
  if (window.WasmLoader && window.WasmLoader.ready) {
    output.textContent = 'Ready!';
  }
})();

function evalMyLang() {
  const input = document.getElementById('my-input').value;
  const output = document.getElementById('my-output');

  if (!window.WasmLoader.ready) {
    output.textContent = 'WASM not loaded...';
    return;
  }

  try {
    // Write input to WASM memory
    const ptr = window.WasmLoader.writeString(input);

    // Call your exported function
    const result = window.WasmLoader.instance.exports.eval(ptr);

    output.textContent = result;
  } catch (e) {
    output.textContent = 'Error: ' + e.message;
  }
}
</script>
```

### Step 4: Use in Blog Post

```yaml
---
title: "My New Interpreter"
wasm: https://nextdoorhacker.com/my-project/interpreter.wasm
---

Try it:

{{</* my-repl */>}}
```

## WasmLoader API

The global `WasmLoader` object provides:

| Property/Method | Description |
|-----------------|-------------|
| `WasmLoader.ready` | Boolean, true when WASM is loaded |
| `WasmLoader.instance` | The WebAssembly instance |
| `WasmLoader.memory` | The WASM memory export |
| `WasmLoader.writeString(str, offset=1024)` | Write null-terminated string to memory, returns pointer |
| `WasmLoader.readString(ptr)` | Read null-terminated string from memory |
| `WasmLoader.load(url)` | Manually load a WASM (auto-called if `WASM_URL` set) |

## Events

| Event | Detail | When |
|-------|--------|------|
| `wasm-ready` | `WasmLoader` object | WASM loaded successfully |
| `wasm-error` | Error object | WASM failed to load |

## WASI Shim

The loader provides a minimal WASI shim for wasi-sdk binaries:

- `args_get`, `args_sizes_get` - stub (returns 0)
- `environ_get`, `environ_sizes_get` - stub
- `fd_read`, `fd_write`, `fd_close`, `fd_seek`, `fd_fdstat_get` - stub
- `proc_exit` - no-op
- `clock_time_get` - stub

This is enough for wasi-sdk's dlmalloc. If your WASM needs more WASI functions, extend `WasmLoader.wasiShim` before loading.

## Files

- `static/js/wasm-loader.js` - Generic WASM loader
- `layouts/partials/extend_head.html` - Conditionally loads wasm-loader.js
- `layouts/shortcodes/lisp-repl.html` - Lisp REPL widget

## Existing REPLs

| Shortcode | WASM URL | Exports Used |
|-----------|----------|--------------|
| `lisp-repl` | `https://nextdoorhacker.com/minilisp-cpp/lisp.wasm` | `eval(ptr) -> int` |

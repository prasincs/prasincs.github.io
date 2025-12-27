// Generic WASM loader with WASI shim
// Usage: Set window.WASM_URL before this script loads, or use data-wasm-url on script tag

window.WasmLoader = {
  instance: null,
  memory: null,
  ready: false,

  // Standard WASI shim for wasi-sdk compiled binaries
  wasiShim: {
    args_get: () => 0,
    args_sizes_get: () => 0,
    proc_exit: () => {},
    fd_write: () => 0,
    fd_read: () => 0,
    fd_close: () => 0,
    fd_seek: () => 0,
    fd_fdstat_get: () => 0,
    environ_sizes_get: () => 0,
    environ_get: () => 0,
    clock_time_get: () => 0,
  },

  async load(url) {
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {
      wasi_snapshot_preview1: this.wasiShim
    });
    this.instance = instance;
    this.memory = instance.exports.memory;
    this.ready = true;
    return instance;
  },

  // Helper: write string to WASM memory and return pointer
  writeString(str, offset = 1024) {
    const bytes = new TextEncoder().encode(str + '\0');
    new Uint8Array(this.memory.buffer, offset, bytes.length).set(bytes);
    return offset;
  },

  // Helper: read null-terminated string from WASM memory
  readString(ptr) {
    const mem = new Uint8Array(this.memory.buffer);
    let end = ptr;
    while (mem[end] !== 0) end++;
    return new TextDecoder().decode(mem.slice(ptr, end));
  }
};

// Auto-load if URL is specified
(async function() {
  const url = window.WASM_URL;
  if (!url) return;

  try {
    await window.WasmLoader.load(url);
    console.log('WASM loaded:', url);

    // Dispatch event so shortcodes can react
    window.dispatchEvent(new CustomEvent('wasm-ready', { detail: window.WasmLoader }));
  } catch (e) {
    console.error('WASM load error:', e);
    window.dispatchEvent(new CustomEvent('wasm-error', { detail: e }));
  }
})();

// Lisp REPL eval function (for lisp-repl shortcode)
function evalLisp() {
  const input = document.getElementById('lisp-input').value;
  const output = document.getElementById('lisp-output');

  if (!window.WasmLoader.ready) {
    output.textContent = 'WASM not loaded yet...';
    return;
  }

  try {
    const ptr = window.WasmLoader.writeString(input);
    const result = window.WasmLoader.instance.exports.eval(ptr);
    output.textContent = result;
  } catch (e) {
    output.textContent = 'Error: ' + e.message;
  }
}

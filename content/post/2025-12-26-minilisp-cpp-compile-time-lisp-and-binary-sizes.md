---
title: "MiniLisp C++: A Compile-Time Lisp Interpreter in C++20"
date: 2025-12-26T06:10:00-08:00
draft: false
TocOpen: true
categories:
- cpp
- software-engineering
tags:
- cpp
- lisp
- constexpr
- c++20
- binary-size
- macos
- linux
- wasm
wasm: https://nextdoorhacker.com/minilisp-cpp/lisp.wasm
---

**TL;DR**: I built a Lisp interpreter that evaluates expressions at **compile-time** using C++20 `constexpr`. The same code works at runtime too—no duplication needed. Along the way, I discovered that macOS adds ~28KB of constant overhead to all C++ binaries, and that Mach-O is surprisingly more efficient than Linux ELF for small programs.

**Try it right now** — this runs the same interpreter compiled to WebAssembly (27KB):

{{< lisp-repl >}}

Some weeks back I saw that [Dan Lemire](https://x.com/lemire) had a PR open on [simdjson](https://github.com/simdjson/simdjson) that added an expression to parse whole JSON. That intrigued me and took the challenge to see if I could write a LISP Interpreter. Here's a minimal [godbolt](https://godbolt.org/z/jqb3jK4ad) playground if you're interested to play around. I don't have this problem as much anymore but I used to need a little DSLs in programs all the time. Maybe long term Lua is right choice but I can see something like this to be useful in a very small form factor like some kind of verified binary that you want to minimize your dependencies and adding a whole new lib will add more complexity.

---

## The Magic: Compile-Time Lisp

Here's what this looks like:

```cpp
// This is evaluated by the compiler, not at runtime!
constexpr auto val = "(+ 10 (* 2 5))"_lisp;
static_assert(val == 20);

constexpr auto head = "(car '(10 20 30))"_lisp;
static_assert(head == 10);
```

If the Lisp expression is invalid, **your code won't compile**. The compiler becomes your Lisp interpreter.

### Why This Matters

- **Catch errors at compile time** - Invalid Lisp expressions fail during build, not at 3 AM in production
- **Zero runtime cost** - The result is baked directly into the binary
- **Type safety** - The compiler verifies your Lisp code before you ship

### The C++20 Features That Make This Possible

C++20 made compile-time programming dramatically more powerful:

1. **constexpr everything** - Vectors, algorithms, and even memory allocation now work at compile-time
2. **User-defined literals** - The `_lisp` suffix creates elegant syntax
3. **std::variant** - Type-safe unions for representing S-expressions
4. **std::span** - Zero-copy parameter passing for operand lists
5. **consteval** - Forces compile-time-only evaluation

### Implementation Highlights

The interpreter is built on a few key components:

**FixedString** - A template struct that captures string literals at compile-time:

```cpp
template <size_t N>
struct FixedString {
    char data[N];
    consteval FixedString(const char (&str)[N]) {
        std::copy(str, str + N, data);
    }
    constexpr std::string_view get() const {
        return std::string_view(data, N - 1);
    }
};
```

**S-Expression Types** - The classic Lisp data structures:

```cpp
// An "Atom" is either a number or a symbol
using Atom = std::variant<long, std::string_view>;

// A "List" is a vector of S-Expressions
using List = std::vector<SExpr>;

// An S-Expression is either an Atom or a List
struct SExpr {
    std::optional<Atom> atom;
    std::optional<List> list;
};
```

**The User-Defined Literal** - The magic entry point:

```cpp
template <FixedString S>
consteval auto operator""_lisp() {
    std::string_view s = S.get();
    auto ast = MiniLisp::parse(s);
    auto result_sexpr = MiniLisp::eval(ast);
    // Extract and return the final long value
    return std::get<long>(*result_sexpr.atom);
}
```

**Functional Arithmetic** - Using `std::transform_reduce` for clean, constexpr-compatible operations:

```cpp
if (op == "+") {
    long result = std::transform_reduce(
        operands.begin(), operands.end(),
        0L,                                    // Initial value
        std::plus<long>(),                     // Reduce operation
        [](const SExpr& e) { return get_long(e); } // Transform
    );
    return SExpr{Atom{result}};
}
```

### Comparison with Other Approaches

| Approach | Example | Pros | Cons |
|----------|---------|------|------|
| Runtime OOP | [ofan's Lisp](https://gist.github.com/ofan/721464) | Simple, ~200 lines | Runtime only |
| Template metaprogramming | [Crisp](https://github.com/petrizhang/crisp), [Templisp](https://github.com/olsner/templisp) | Compile-time | Ugly syntax, hard to debug |
| **constexpr (this project)** | minilisp-cpp | Clean, dual-mode, debuggable | Requires C++20 |

The ofan gist shows a classic runtime interpreter in ~200 lines of clean C++. But with C++20 constexpr, we get the same readable code that **also works at compile time**—that's the key insight.

## Extending the Interpreter

Adding new functions is straightforward. Here's how to add a `max` function:

```cpp
else if (op == "max") {
    p_assert(!operands.empty(), "'max' requires at least one argument");
    long result = get_long(operands[0]);
    for (size_t i = 1; i < operands.size(); ++i) {
        long val = get_long(operands[i]);
        if (val > result) result = val;
    }
    return SExpr{Atom{result}};
}
```

This automatically works at both compile-time and runtime—no extra effort needed.

## The Binary Size Deep Dive

While optimizing the interpreter for size, I learned two lessons that would have saved me hours if I'd known them upfront.

### Lesson 1: Know When to Stop

After applying every optimization I could find, the macOS binary sat stubbornly at 34KB. I spent time trying to squeeze out more bytes before realizing: **34KB is the floor**. On macOS, the Mach-O binary format has ~28KB of unavoidable overhead. Once you hit that limit, further code optimization is wasted effort.

### Lesson 2: Measure the Right Thing

File size (`ls -l`) is misleading—it's dominated by format overhead you can't control. What you *can* control is actual code size, measured with the `size` command. My real win was a **32% reduction in executable code** (10.7KB → 7.3KB), even though the file size barely budged.

### Build Configurations

| Build | macOS | Linux | WASM | Techniques |
|-------|-------|-------|------|------------|
| Default | 39KB | - | - | `-O2` |
| Small | 36KB | - | - | `-Os`, LTO, strip |
| Ultra-small | 34KB | 66KB (10KB UPX) | 27KB | POSIX I/O, no iostream, wasm-opt |

### What We Actually Removed

Here's the real code reduction (measured with `size`):

```
DEFAULT BUILD (with iostream):
  Code section:      8,484 bytes
  Exception tables:    844 bytes
  Total code:       10,753 bytes

ULTRA-SMALL BUILD (POSIX I/O):
  Code section:      5,752 bytes  (32% reduction!)
  Exception tables:    288 bytes  (66% reduction!)
  Total code:        7,273 bytes  (32% reduction!)
```

The techniques:

1. Replace `<iostream>` with POSIX `write()`/`read()`
2. Replace `std::string` with fixed buffers
3. Simplify exception handling

Build flags: `-Os -flto -fno-rtti -ffunction-sections -fdata-sections -Wl,-dead_strip`

## Why macOS Has a 34KB Floor

Let's dig into why you can't go below 34KB on macOS—understanding this saves you from chasing impossible optimizations.

### Mach-O Segment Layout

Running `size -m lisp_repl` reveals the structure:

```
Segment __PAGEZERO: 4294967296  (4GB virtual, catches NULL pointers)
Segment __TEXT: 16384           (contains ~7KB code + padding)
Segment __DATA_CONST: 16384     (contains 328 bytes + padding)
Segment __LINKEDIT: varies      (symbols, code signature)
```

<details>
<summary>Full output of <code>size -m lisp_repl</code></summary>

```
Segment __PAGEZERO: 4294967296 (zero fill)
Segment __TEXT: 16384
        Section __text: 8484
        Section __stubs: 336
        Section __gcc_except_tab: 844
        Section __cstring: 737
        Section __unwind_info: 352
        total 10753
Segment __DATA_CONST: 16384
        Section __got: 328
        total 328
Segment __LINKEDIT: 16384
total 4295016448
```

</details>

**The key insight**: Mach-O uses **16KB segment alignment**. Each segment must start on a 16KB boundary, so even tiny segments consume 16KB of disk space.

- 3 on-disk segments × 16KB = ~48KB baseline
- After strip: ~34KB (removes some `__LINKEDIT`)

**This means 34KB is essentially the floor for any C++ program on macOS**—even "hello world" is ~33KB.

### The Counter-Intuitive Comparison

| Metric | macOS Mach-O | Linux ELF |
|--------|--------------|-----------|
| Stripped size | 35,016 bytes | 67,952 bytes |
| Actual code (text) | ~7KB | ~11KB |
| Format overhead | ~28KB | ~56KB |
| Page alignment | 16KB | 4KB |

**Despite 16KB pages, Mach-O is MORE efficient than ELF!**

Why ELF is larger:
- More section headers and metadata
- Debug info remnants even after strip
- Symbol table overhead

### Inspecting Your Own Binaries

```bash
# macOS - see segment sizes
size -m your_binary

# macOS - detailed Mach-O structure
otool -l your_binary | grep -A5 "segname"

# Linux - section sizes
size your_binary

# Linux - detailed sections
readelf -S your_binary
```

## The UPX Factor (Linux Only)

UPX (Ultimate Packer for eXecutables) compresses binaries:

| Algorithm | Size | Compression |
|-----------|------|-------------|
| Uncompressed | 67,952 bytes | - |
| UPX NRV (default) | **10,288 bytes** | 85% reduction |
| UPX LZMA | 11,528 bytes | 83% reduction |

**NRV beats LZMA for small binaries by 11%!** This surprised me—I expected LZMA to always win.

Why not macOS?
- UPX is officially unsupported for Mach-O
- Code signing conflicts with compressed binaries
- `--force-macos` often causes segfaults

## WebAssembly Build

The interpreter also compiles to WebAssembly, producing a **27KB** binary after optimization.

### wasi-sdk vs Emscripten

I chose wasi-sdk over Emscripten for one reason: **no JavaScript bloat**.

| Toolchain | Output Size | What You Get |
|-----------|-------------|--------------|
| wasi-sdk + wasm-opt | 27KB | Single `.wasm` file |
| Emscripten | 100KB+ | `.wasm` + JavaScript runtime |

Emscripten provides a full POSIX-like environment with filesystem emulation. For a simple eval function, that's overkill. wasi-sdk produces a minimal WASI-compliant binary that only needs stub implementations for a handful of syscalls.

### Build Flags

```bash
# Compile with wasi-sdk
clang++ -std=c++20 -Os -fno-exceptions -Wl,--no-entry -Wl,--export-dynamic

# Optimize with wasm-opt (from Binaryen)
wasm-opt -Oz --strip-debug --strip-producers lisp.wasm -o lisp.wasm
```

Key choices:
- `-fno-exceptions` - Errors via `__builtin_trap()`, reduces binary size
- `-Wl,--export-dynamic` - Export the `eval` function for JS access
- `-Wl,--no-entry` - Library mode, no `main()`

### wasm-opt Optimization

| Stage | Size | Reduction |
|-------|------|-----------|
| After wasi-sdk compile | 33KB | — |
| After wasm-opt -Oz | 33KB | ~0% (already optimized) |
| After --strip-debug | 28KB | 15% |
| After --strip-producers | **27KB** | **18% total** |

The `-Oz` flag alone doesn't help much since wasi-sdk already optimizes well, but stripping debug info and producer metadata saves ~6KB.

## Try It Yourself

### Clone and Build

```bash
git clone https://github.com/prasincs/minilisp-cpp
cd minilisp-cpp

# Default build
make

# Size-optimized
make small

# Ultra-small (POSIX I/O)
make ultra-small
```

### Verify Compile-Time Evaluation

The `static_assert` statements in `main.cpp` prove compile-time evaluation works:

```cpp
constexpr auto val = "(+ 10 (* 2 5))"_lisp;
static_assert(val == 20);  // Fails to compile if wrong!

constexpr auto val3 = "(car '(10 20 30))"_lisp;
static_assert(val3 == 10);
```

Try introducing an error—the compiler will catch it:

```cpp
// This fails at compile time with a parse error
constexpr auto bad = "(+ 1"_lisp;
```

### Cross-Compile for Linux (from macOS)

```bash
./build-linux.sh
# Uses Docker to build Linux ARM64 binary
# Shows size comparison automatically
```

### Measure Binary Sections

```bash
# macOS
size -m lisp_repl
otool -l lisp_repl | grep -A5 "segname"

# Linux
size lisp_repl
readelf -S lisp_repl
```

## Key Takeaways

**On binary size optimization:**
1. **Know when to stop** - macOS has a ~34KB floor due to Mach-O format overhead. Once you hit it, further code optimization is wasted effort.
2. **Measure actual code size** - Use `size`, not `ls -l`. File size is dominated by format overhead; code size is what you can control.
3. **iostream is expensive** - Removing it saved 32% of actual executable code. If size matters, use POSIX I/O.

**On C++20:**

4. **constexpr is powerful** - A full Lisp interpreter at compile time in readable code
5. **Same code, dual modes** - No template metaprogramming gymnastics required

## Conclusion

Building a compile-time Lisp interpreter turned out to be a journey through modern C++ and binary format archaeology. The compile-time evaluation is genuinely useful for catching errors early, but the binary size investigation taught me more about platform-specific behavior than I expected.

The source code is available at [github.com/prasincs/minilisp-cpp](https://github.com/prasincs/minilisp-cpp), as well as a standalone [playground](https://nextdoorhacker.com/minilisp-cpp/). Try adding new operations—they'll automatically work at both compile-time and runtime.

Sometimes the journey of optimization teaches more than the destination.

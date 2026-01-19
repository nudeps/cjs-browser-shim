# CJS Browser Shim

This package provides a lightweight shim for CommonJS (CJS) modules in the browser.
It allows you to use `require()` in the browser by resolving specifiers to URLs using any import maps found on the page.

- ✅ Uses import maps to resolve specifiers
- ✅ Supports multiple import maps
- ✅ Supports specifier prefixes (e.g. `require(foo/bar.js`)
- ✅ Supports relative paths (e.g. `require("./foo/bar.js")`)

Prior art:
- [`browser-cjs`](https://lucivuc.github.io/browser-cjs/)

## Usage

To just `require()` specifiers, you can use the default export:

```js
import require from "cjs-browser-shim";
const { createElement } = require("react");
```

This will resolve any relative paths based on the document URL at the top level (nested `require()` calls by dependencies will use the correct URL).

To `require()` relative paths too, you’d need to create your own, similarly to using [Node's `createRequire()`](https://nodejs.org/api/module.html#modulecreaterequirefilename):

```js
import { createRequire } from "cjs-browser-shim";
const require = createRequire(import.meta.url);
const { createElement } = require("./foo/bar.js");
```

This should never be necessary when using this as part of [Nudeps](https://npmjs.com/package/nudeps), since you’d only be `require()`ing specifiers.

## API

> [!NOTE]
> When using this as part of [Nudeps](https://npmjs.com/package/nudeps), you almost never need anything other than the default export.

### `require(specifier, parentURL = location.href)` _(default export)_

A CJS-like `require()` function, defaulting to the document URL to resolve relative paths at the top level.

### `createRequire(parentURL)`

Returns a `require()` function that uses the given parent URL to resolve relative paths at the top level.
Similar to [Node's `createRequire()`](https://nodejs.org/api/module.html#modulecreaterequirefilename).

### `getResolvedImportMap()`

Computes the combined import map from all import maps on the page, returns it, and updates the internal map reference used to resolve specifiers.

### `resolve(specifierOrPath, parentURL = location.href)`

Resolve a specifier or relative URL to an absolute URL using any import maps on the page
Throws a `TypeError` for unknown specifiers.

### `cache`

A cache of URLs to fetched modules.

### `isSpecifier(specifier)`

Checks if a string is a valid specifier (i.e. not a relative path).

export const cache = {};
let map;

/**
 * Get a combined import map from all import maps on the page
 * Also updates the map used to resolve specifiers
 * @returns {imports: Record<string, string>, scopes: Record<string, Record<string, string>>} The combined import map
 */
export function getResolvedImportMap () {
	let maps = [...document.querySelectorAll("script[type=importmap]")].map(s => {
		try {
			return JSON.parse(s.textContent);
		}
		catch (e) {}
	});

	// Conflicts are resolved in a first one wins manner.
	maps = maps.reverse();

	map = {imports: {}, scopes: {}};
	for (let m of maps) {
		if (m.imports) {
			Object.assign(map.imports, m.imports);
		}
		if (m.scopes) {
			for (let scope in m.scopes) {
				map.scopes[scope] ??= {};
				Object.assign(map.scopes[scope], m.scopes[scope]);
			}
		}
	}
	return map;
}

/**
 * Resolve a specifier or relative path to a URL using any import maps on the page
 * @param {string} specifier - The specifier to resolve
 * @param {string} parentURL - The parent URL to resolve the specifier relative to
 * @returns {string} The resolved URL
 * @throws {TypeError} For unknown specifiers
 */
export function resolve (specifier, parentURL = location.href) {
	if (!isSpecifier(specifier)) {
		return new URL(specifier, parentURL).href;
	}

	map ??= getResolvedImportMap();

	for (let s in map.imports) {
		if (specifier === s) {
			return new URL(map.imports[s], parentURL).href;
		}
		if (s.endsWith("/") && specifier.startsWith(s)) {
			let target = map.imports[s] + specifier.slice(s.length);
			return new URL(target, parentURL).href;
		}
	}

	throw new TypeError(`Unknown specifier: ${specifier}`);
}

export function isSpecifier (specifier) {
	return !specifier.startsWith(".") && !specifier.startsWith("/");
}

export function require (specifier, parentURL = location.href) {
	let url = resolve(specifier, parentURL);

	if (url in cache) {
		return cache[url];
	}

	// Sync XHR request
	const xhr = new XMLHttpRequest();
	xhr.open("GET", url, false);
	xhr.send();

	if (xhr.status < 200 || xhr.status >= 400) {
		throw new Error(`require(): Failed to fetch ${url} (HTTP ${xhr.status})`);
	}

	// Check content type
	let contentType = xhr.getResponseHeader("Content-Type");
	if (contentType && contentType.includes("application/json")) {
		let json;
		try {
			json = JSON.parse(xhr.responseText);
		}
		catch (e) {
			return;
		}

		return (cache[url] = json);
	}

	let module = { exports: {} };
	let __filename = url;
	let __dirname = new URL(".", url).href;
	let process = globalThis.process ?? { env: { NODE_ENV: "production" } };

	// Cache early to support cycles (Node-like behavior)
	cache[url] = module.exports;

	let source = [xhr.responseText, `//# sourceURL=${url}`].join("\n");

	// Node-style wrapper: keep `exports`/`module` function-scoped so closures work.
	new Function("exports", "require", "module", "__filename", "__dirname", "process", source).call(
		module.exports,
		module.exports,
		createRequire(url),
		module,
		__filename,
		__dirname,
		process,
	);

	return (cache[url] = module.exports);
}

export function createRequire (url) {
	return specifier => require(specifier, url);
}

export default require;

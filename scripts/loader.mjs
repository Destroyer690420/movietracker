import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * Module loader that lets the verification scripts run the real app code
 * under Node:
 *
 *  - `firebase/firestore` is swapped for the in-memory mock
 *  - `firebase/app` and `firebase/auth` are stubbed out
 *  - `src/firebase.js` is stubbed out (it uses Vite's `import.meta.env`)
 *  - extensionless relative imports are resolved, the way Vite does
 */

const MOCK = pathToFileURL(new URL('./mock-firestore.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).href;

const FIREBASE_STUB = 'data:text/javascript,' + encodeURIComponent(
    'export const db = {}; export const auth = {}; export const googleProvider = {}; export default {};'
);

register('data:text/javascript,' + encodeURIComponent(`
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'firebase/firestore') {
    return { url: '${MOCK}', shortCircuit: true };
  }
  if (specifier === 'firebase/app' || specifier === 'firebase/auth') {
    return { url: '${FIREBASE_STUB}', shortCircuit: true };
  }

  // Vite allows extensionless relative imports, Node does not.
  if (specifier.startsWith('.') && context.parentURL) {
    const base = new URL(specifier, context.parentURL);
    for (const ext of ['.js', '.jsx']) {
      const candidate = new URL(base.href + ext);
      if (existsSync(fileURLToPath(candidate))) {
        // src/firebase.js uses import.meta.env, which only exists in Vite.
        if (candidate.pathname.endsWith('/src/firebase.js')) {
          return { url: '${FIREBASE_STUB}', shortCircuit: true };
        }
        return { url: candidate.href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}
`));

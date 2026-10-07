import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { api } from './helpers';

/**
 * axios encadena interceptores (p. ej. el que agrega el Bearer token) antes de llegar al adaptador
 * de axios-mock-adapter, así que entre llamar a `clienteAPI.get(...)` y que el emparejamiento del
 * mock realmente se ejecute pueden pasar varios "ticks" de microtareas. Si una prueba termina justo
 * en ese margen, `api.reset()` puede borrar los mocks antes de que esa petición ya en curso alcance a
 * emparejar, y aparece un falso "Could not find mock for" dentro de una prueba completamente distinta.
 * Vaciar la cola de microtareas unas vueltas antes de limpiar le da tiempo a esas peticiones rezagadas
 * a resolver contra los mocks de la prueba que las originó.
 */
async function vaciarMicrotareas(vueltas = 5) {
  for (let i = 0; i < vueltas; i++) {
    await Promise.resolve();
  }
}

/**
 * Los envíos multipart (FormData con archivos) se serializan en Node con streams (`combined-stream`/
 * `readable-stream`), que se leen en macrotareas (`setImmediate`/`setTimeout`), no en microtareas.
 * Un `await Promise.resolve()` no les da tiempo; hace falta ceder el hilo con un `setTimeout` real.
 */
function vaciarMacrotarea() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

afterEach(async () => {
  await vaciarMicrotareas();
  await vaciarMacrotarea();
  await vaciarMicrotareas();
  cleanup();
  localStorage.clear();
  api.reset();
});

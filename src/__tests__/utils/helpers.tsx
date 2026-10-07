import { type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import clienteAPI from '../../api/clienteAxios';
import AutenticacionContext from '../../features/seguridad/utilidades/AutenticacionContex';
import type Claim from '../../features/seguridad/modelos/Claim';

/** Adaptador HTTP compartido: intercepta clienteAPI (incluidos sus interceptores reales). Se resetea tras cada prueba. */
export const api = new MockAdapter(clienteAPI, { onNoMatch: 'throwException' });

/** Responde un listado paginado incluyendo el encabezado que consume useEntidades. */
export function responderListado<T>(url: string, datos: T[], total = datos.length) {
  api.onGet(url).reply(200, datos, { 'cantidad-total-registros': String(total) });
}

/** Construye un JWT sintético (payload en base64 estándar, que es lo que decodifica atob). */
export function crearJWT(claims: Record<string, unknown>): string {
  const codificar = (o: unknown) => btoa(JSON.stringify(o));
  return `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar(claims)}.firma`;
}

/** Simula una sesión iniciada guardando token y expiración en localStorage. */
export function iniciarSesion(claims: Record<string, unknown> = { email: 'admin@correo.com', esadmin: '1' }, expiraEnMs = 3_600_000) {
  const expiracion = new Date(Date.now() + expiraEnMs).toISOString();
  localStorage.setItem('token', crearJWT(claims));
  localStorage.setItem('token-expiracion', expiracion);
  return { token: localStorage.getItem('token')!, expiracion };
}

function Ubicacion() {
  const l = useLocation();
  return <output data-testid="ubicacion">{l.pathname + l.search}</output>;
}

function DestinoGenerico() {
  const l = useLocation();
  return <p>DESTINO: {l.pathname}</p>;
}

interface OpcionesRender {
  ruta?: string;
  claims?: Claim[];
  actualizar?: (claims: Claim[]) => void;
}

/**
 * Renderiza rutas dentro de un MemoryRouter + AutenticacionContext.
 * Añade una ruta comodín que pinta "DESTINO: <ruta>" para poder afirmar navegaciones.
 */
export function renderConRutas(rutas: Array<{ path: string; element: ReactElement }>, opciones: OpcionesRender = {}) {
  const { ruta = '/', claims = [], actualizar = vi.fn() } = opciones;
  const usuario = userEvent.setup();
  const utils = render(
    <AutenticacionContext.Provider value={{ claims, actualizar }}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          {rutas.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
          <Route path="*" element={<DestinoGenerico />} />
        </Routes>
        <Ubicacion />
      </MemoryRouter>
    </AutenticacionContext.Provider>,
  );
  return { usuario, actualizar, ...utils };
}

export const ubicacionActual = () => screen.getByTestId('ubicacion').textContent;

/**
 * Ejecuta `fn` capturando los rechazos de promesa no manejados que provoque el código bajo prueba
 * (p. ej. un `.then()` sin `.catch()`), para poder afirmarlos sin que Vitest marque toda la corrida como fallida.
 */
export async function capturarRechazosNoManejados(fn: () => Promise<void>): Promise<unknown[]> {
  const previos = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  const capturados: unknown[] = [];
  const captor = (razon: unknown) => { capturados.push(razon); };
  process.on('unhandledRejection', captor);
  try {
    await fn();
    await new Promise(resolver => setTimeout(resolver, 30));
  } finally {
    process.off('unhandledRejection', captor);
    previos.forEach(l => process.on('unhandledRejection', l));
  }
  return capturados;
}

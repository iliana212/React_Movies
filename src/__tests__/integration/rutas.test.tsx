import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import AppRoutes from '../../AppRoutes';
import { api, renderConRutas, responderListado, ubicacionActual } from '../utils/helpers';
import { claimsAdmin, claimsUsuarioComun, crearPelicula } from '../utils/fixtures';
import type Claim from '../../features/seguridad/modelos/Claim';

const NO_AUTORIZADO = 'No autorizado para este contenido';

/** Monta todas las rutas reales de la aplicación (AppRoutes) en la ubicación indicada. */
function renderApp(ruta: string, claims: Claim[] = []) {
  api.onGet('/peliculas/landing').reply(200, { enCines: [crearPelicula()], proximosEstrenos: [] });
  api.onGet('/generos/todos').reply(200, []);
  responderListado('/peliculas/filtrar', []); // FiltrarPeliculas ahora busca siempre, aunque /generos/todos esté vacío (hallazgo #5 corregido)
  return renderConRutas([{ path: '/*', element: <AppRoutes /> }], { ruta, claims });
}

const rutasAdmin = [
  '/generos', '/generos/crear', '/generos/editar/1',
  '/actores', '/actores/crear', '/actores/editar/1',
  '/cines', '/cines/crear', '/cines/editar/1',
  '/peliculas/crear', '/peliculas/editar/1',
];

describe('Enrutamiento y rutas protegidas — integración', () => {
  describe('casos normales', () => {
    it('"/" muestra la página de inicio con En Cines y Próximos Estrenos', async () => {
      renderApp('/');
      expect(await screen.findByRole('heading', { name: 'En Cines' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Próximos Estrenos' })).toBeInTheDocument();
      expect(await screen.findByText('Matrix')).toBeInTheDocument();
    });

    it('un administrador accede al índice de géneros', async () => {
      responderListado('/generos', [{ id: 1, nombre: 'Acción' }], 1);
      renderApp('/generos', claimsAdmin);
      expect(await screen.findByRole('heading', { name: 'Géneros' })).toBeInTheDocument();
      expect(await screen.findByText('Acción')).toBeInTheDocument();
      expect(screen.queryByText(NO_AUTORIZADO)).not.toBeInTheDocument();
    });

    it.each(['/login', '/registro'])('%s es pública y muestra su formulario', ruta => {
      renderApp(ruta);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('/peliculas/filtrar es pública (visitante sin sesión)', async () => {
      renderApp('/peliculas/filtrar');
      expect(await screen.findByRole('heading', { name: 'Filtro de peliculas' })).toBeInTheDocument();
      // El encabezado no depende de los datos y aparece antes de que termine la búsqueda inicial;
      // se espera a que termine para no dejar esa petición en vuelo cuando el mock se resetee.
      await waitFor(() => expect(api.history.get.some(g => g.url === '/peliculas/filtrar')).toBe(true));
    });
  });

  describe('casos límite', () => {
    it('una ruta inexistente redirige a "/"', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {}); // RutaNoEncontrada registra la ruta perdida
      renderApp('/esto/no/existe');
      await waitFor(() => expect(ubicacionActual()).toBe('/'));
      expect(await screen.findByRole('heading', { name: 'En Cines' })).toBeInTheDocument();
    });

    it('/generos/crear no se confunde con /generos/editar/:id', async () => {
      renderApp('/generos/crear', claimsAdmin);
      expect(await screen.findByRole('heading', { name: 'Crear Género' })).toBeInTheDocument();
    });

    it('/peliculas/crear (protegida) tiene prioridad sobre /peliculas/:id', async () => {
      api.onGet('/peliculas/postget').reply(200, { generos: [], cines: [] });
      renderApp('/peliculas/crear', claimsAdmin);
      expect(await screen.findByRole('heading', { name: 'Crear Pelicula' })).toBeInTheDocument();
    });

    it('una ruta con barra final sigue resolviendo (/generos/)', async () => {
      responderListado('/generos', [], 0);
      renderApp('/generos/', claimsAdmin);
      expect(await screen.findByRole('heading', { name: 'Géneros' })).toBeInTheDocument();
    });
  });

  describe('escenarios de falla (acceso no autorizado)', () => {
    it.each(rutasAdmin)('visitante sin sesión no puede abrir %s', async ruta => {
      renderApp(ruta);
      expect(await screen.findByText(NO_AUTORIZADO)).toBeInTheDocument();
    });

    it.each(rutasAdmin)('usuario autenticado sin claim esadmin no puede abrir %s', async ruta => {
      renderApp(ruta, claimsUsuarioComun);
      expect(await screen.findByText(NO_AUTORIZADO)).toBeInTheDocument();
    });

    it('una ruta protegida rechazada no dispara ninguna petición al backend', async () => {
      renderApp('/generos');
      await screen.findByText(NO_AUTORIZADO);
      expect(api.history.get).toHaveLength(0);
    });

    it('DEBERÍA proteger /usuarios para que solo la vea un administrador', async () => {
      responderListado('/usuarios/listadoUsuarios', [{ email: 'alguien@correo.com' }], 1);
      renderApp('/usuarios');
      expect(await screen.findByText(NO_AUTORIZADO)).toBeInTheDocument();
    });
  });
});

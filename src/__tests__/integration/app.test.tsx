import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { api, crearJWT, iniciarSesion } from '../utils/helpers';
import { crearPelicula } from '../utils/fixtures';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
vi.mock('react-leaflet', () => ({ MapContainer: () => null, Marker: () => null, Popup: () => null, TileLayer: () => null, useMapEvent: vi.fn() }));

beforeEach(() => {
  window.history.pushState({}, '', '/'); // App usa BrowserRouter: cada prueba parte de "/"
  api.onGet('/peliculas/landing').reply(200, { enCines: [crearPelicula()], proximosEstrenos: [] });
  api.onGet('/generos/todos').reply(200, []);
});

const montar = () => ({ usuario: userEvent.setup(), ...render(<App />) });

describe('Aplicación completa — integración (App + Menu + AppRoutes + sesión)', () => {
  describe('casos normales', () => {
    it('visitante: ve el inicio, Registro y Login, y ningún enlace de administración', async () => {
      montar();
      expect(await screen.findByRole('link', { name: 'Matrix' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Registro/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Login/ })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Géneros' })).not.toBeInTheDocument();
    });

    it('al abrir con una sesión guardada válida restaura los claims: saludo, Logout y enlaces de administrador', async () => {
      iniciarSesion({ email: 'admin@correo.com', esadmin: '1' });
      montar();

      expect(await screen.findByText(/Hola admin@correo.com/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Logout/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Géneros' })).toBeInTheDocument();
    });

    it('flujo completo: Login → el menú refleja la sesión → Logout regresa a visitante', async () => {
      api.onPost('/usuarios/login').reply(200, {
        token: crearJWT({ email: 'ana@correo.com' }),
        expiracion: new Date(Date.now() + 3_600_000).toISOString(),
      });
      const { usuario } = montar();
      await screen.findByRole('link', { name: 'Matrix' });

      await usuario.click(screen.getByRole('link', { name: /Login/ }));
      await usuario.type(screen.getByLabelText('Email'), 'ana@correo.com');
      await usuario.type(screen.getByLabelText('Password'), 'Secreta123!');
      await usuario.click(screen.getByRole('button', { name: 'Enviar' }));

      expect(await screen.findByText(/Hola ana@correo.com/)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Géneros' })).not.toBeInTheDocument(); // no es admin
      expect(window.location.pathname).toBe('/');

      await usuario.click(screen.getByRole('button', { name: /Logout/ }));

      expect(await screen.findByRole('link', { name: /Login/ })).toBeInTheDocument();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('un administrador entra a /generos desde el menú', async () => {
      iniciarSesion({ email: 'admin@correo.com', esadmin: '1' });
      api.onGet('/generos').reply(200, [{ id: 1, nombre: 'Acción' }], { 'cantidad-total-registros': '1' });
      const { usuario } = montar();

      await usuario.click(await screen.findByRole('link', { name: 'Géneros' }));

      expect(await screen.findByText('Acción')).toBeInTheDocument();
    });
  });

  describe('casos límite y de falla', () => {
    it('una sesión guardada pero expirada se descarta al iniciar (queda como visitante y se limpia el almacenamiento)', async () => {
      iniciarSesion({ email: 'admin@correo.com', esadmin: '1' }, -1000);
      montar();
      expect(await screen.findByRole('link', { name: /Login/ })).toBeInTheDocument();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('token-expiracion')).toBeNull();
    });

    it('un token guardado corrupto se descarta sin romper la aplicación', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('token', 'no-es-un-jwt');
      localStorage.setItem('token-expiracion', new Date(Date.now() + 60_000).toISOString());
      montar();
      expect(await screen.findByRole('link', { name: /Login/ })).toBeInTheDocument();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('un usuario común que abre una URL de administración ve "No autorizado" y no consulta la API', async () => {
      iniciarSesion({ email: 'user@correo.com' });
      window.history.pushState({}, '', '/generos');
      montar();

      expect(await screen.findByText('No autorizado para este contenido')).toBeInTheDocument();
      await waitFor(() => expect(api.history.get.filter(g => g.url === '/generos')).toHaveLength(0));
    });

    it('la petición saliente del inicio incluye el Bearer token cuando hay sesión', async () => {
      const { token } = iniciarSesion();
      montar();
      await screen.findByRole('link', { name: 'Matrix' });
      expect(api.history.get.find(g => g.url === '/peliculas/landing')!.headers!.Authorization).toBe(`Bearer ${token}`);
    });
  });
});

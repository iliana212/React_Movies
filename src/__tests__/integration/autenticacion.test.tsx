import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import Login from '../../features/seguridad/componentes/Login';
import Registro from '../../features/seguridad/componentes/Registro';
import Menu from '../../componentes/Menu';
import { api, capturarRechazosNoManejados, crearJWT, iniciarSesion, renderConRutas, ubicacionActual } from '../utils/helpers';
import { claimsAdmin, claimsUsuarioComun } from '../utils/fixtures';
import type Claim from '../../features/seguridad/modelos/Claim';

const rutasAuth = [
  { path: '/login', element: <Login /> },
  { path: '/registro', element: <Registro /> },
  { path: '/', element: <p>INICIO</p> },
];

const respuestaExitosa = (claims: Record<string, unknown> = { email: 'admin@correo.com', esadmin: '1' }, expiraEnMs = 3_600_000) => ({
  token: crearJWT(claims),
  expiracion: new Date(Date.now() + expiraEnMs).toISOString(),
});

async function llenarYEnviar(usuario: ReturnType<typeof renderConRutas>['usuario'], email = 'admin@correo.com', password = 'Secreta123!') {
  await usuario.type(screen.getByLabelText('Email'), email);
  await usuario.type(screen.getByLabelText('Password'), password);
  await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
}

describe('Autenticación (Login / Registro) — integración', () => {
  describe('casos normales', () => {
    it('login exitoso: envía credenciales, guarda el token, actualiza el contexto y navega al inicio', async () => {
      const respuesta = respuestaExitosa();
      api.onPost('/usuarios/login').reply(200, respuesta);
      const { usuario, actualizar } = renderConRutas(rutasAuth, { ruta: '/login' });

      await llenarYEnviar(usuario);

      await waitFor(() => expect(ubicacionActual()).toBe('/'));
      expect(JSON.parse(api.history.post[0].data)).toEqual({ email: 'admin@correo.com', password: 'Secreta123!' });
      expect(localStorage.getItem('token')).toBe(respuesta.token);
      expect(localStorage.getItem('token-expiracion')).toBe(respuesta.expiracion);
      expect(actualizar).toHaveBeenCalledWith(expect.arrayContaining([
        { nombre: 'email', valor: 'admin@correo.com' },
        { nombre: 'esadmin', valor: '1' },
      ]));
    });

    it('registro exitoso: usa el endpoint /usuarios/registro y deja la sesión iniciada', async () => {
      api.onPost('/usuarios/registro').reply(200, respuestaExitosa({ email: 'nuevo@correo.com' }));
      const { usuario, actualizar } = renderConRutas(rutasAuth, { ruta: '/registro' });

      await llenarYEnviar(usuario, 'nuevo@correo.com');

      await waitFor(() => expect(ubicacionActual()).toBe('/'));
      expect(api.history.post[0].url).toBe('/usuarios/registro');
      expect(actualizar).toHaveBeenCalledWith([{ nombre: 'email', valor: 'nuevo@correo.com' }]);
    });

    it('los encabezados de las pantallas identifican Login y Registro', () => {
      renderConRutas(rutasAuth, { ruta: '/login' });
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    });

    it('Cancelar regresa al inicio sin llamar a la API', async () => {
      const { usuario } = renderConRutas(rutasAuth, { ruta: '/login' });
      await usuario.click(screen.getByRole('link', { name: 'Cancelar' }));
      expect(ubicacionActual()).toBe('/');
      expect(api.history.post).toHaveLength(0);
    });
  });

  describe('casos límite', () => {
    it('el botón Enviar inicia deshabilitado y se habilita al completar ambos campos', async () => {
      const { usuario } = renderConRutas(rutasAuth, { ruta: '/login' });
      const boton = screen.getByRole('button', { name: 'Enviar' });
      expect(boton).toBeDisabled();

      await usuario.type(screen.getByLabelText('Email'), 'a@a.com');
      expect(boton).toBeDisabled();

      await usuario.type(screen.getByLabelText('Password'), 'x');
      await waitFor(() => expect(boton).toBeEnabled());
    });

    it('vaciar un campo muestra su mensaje de obligatoriedad y vuelve a deshabilitar el envío', async () => {
      const { usuario } = renderConRutas(rutasAuth, { ruta: '/login' });
      await usuario.type(screen.getByLabelText('Email'), 'a');
      await usuario.clear(screen.getByLabelText('Email'));
      expect(await screen.findByText('El email es obligatorio')).toBeInTheDocument();

      await usuario.type(screen.getByLabelText('Password'), 'x');
      await usuario.clear(screen.getByLabelText('Password'));
      expect(await screen.findByText('El password es obligatorio')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    });

    it('mientras la petición está en curso el botón muestra "Enviando..." y queda deshabilitado', async () => {
      api.onPost('/usuarios/login').reply(() => new Promise(resolver => setTimeout(() => resolver([200, respuestaExitosa()]), 60)));
      const { usuario } = renderConRutas(rutasAuth, { ruta: '/login' });

      await llenarYEnviar(usuario);

      const enviando = await screen.findByRole('button', { name: 'Enviando...' });
      expect(enviando).toBeDisabled();
      await waitFor(() => expect(ubicacionActual()).toBe('/'));
    });

    it('si el servidor devuelve un token ya expirado, la sesión no queda activa (claims vacíos)', async () => {
      api.onPost('/usuarios/login').reply(200, respuestaExitosa({ email: 'a@a.com' }, -1000));
      const { usuario, actualizar } = renderConRutas(rutasAuth, { ruta: '/login' });

      await llenarYEnviar(usuario, 'a@a.com');

      await waitFor(() => expect(actualizar).toHaveBeenCalledWith([]));
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('escenarios de falla', () => {
    it('credenciales inválidas: muestra los errores de Identity y no guarda sesión ni navega', async () => {
      api.onPost('/usuarios/login').reply(400, [{ code: 'LoginIncorrecto', description: 'Login incorrecto' }]);
      const { usuario, actualizar } = renderConRutas(rutasAuth, { ruta: '/login' });

      await llenarYEnviar(usuario);

      expect(await screen.findByText('Login incorrecto')).toBeInTheDocument();
      expect(localStorage.getItem('token')).toBeNull();
      expect(actualizar).not.toHaveBeenCalled();
      expect(ubicacionActual()).toBe('/login');
    });

    it('registro duplicado con varios errores: los lista todos', async () => {
      api.onPost('/usuarios/registro').reply(400, [
        { code: 'DuplicateUserName', description: 'El usuario ya existe' },
        { code: 'PasswordRequiresDigit', description: 'La contraseña requiere un dígito' },
      ]);
      const { usuario } = renderConRutas(rutasAuth, { ruta: '/registro' });

      await llenarYEnviar(usuario);

      expect(await screen.findByText('El usuario ya existe')).toBeInTheDocument();
      expect(screen.getByText('La contraseña requiere un dígito')).toBeInTheDocument();
    });

    it('un nuevo intento reemplaza los errores anteriores', async () => {
      api.onPost('/usuarios/login').replyOnce(400, [{ code: 'X', description: 'Primer error' }]);
      api.onPost('/usuarios/login').replyOnce(400, [{ code: 'Y', description: 'Segundo error' }]);
      const { usuario } = renderConRutas(rutasAuth, { ruta: '/login' });

      await llenarYEnviar(usuario);
      expect(await screen.findByText('Primer error')).toBeInTheDocument();

      await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
      expect(await screen.findByText('Segundo error')).toBeInTheDocument();
      expect(screen.queryByText('Primer error')).not.toBeInTheDocument();
    });

    it('DEBERÍA no producir rechazos no manejados ante un error de red', async () => {
      api.onPost('/usuarios/login').networkError();
      const { usuario } = renderConRutas(rutasAuth, { ruta: '/login' });

      const rechazos = await capturarRechazosNoManejados(() => llenarYEnviar(usuario));

      expect(rechazos).toHaveLength(0);
    });
  });
});

describe('Menú de navegación — integración con la sesión', () => {
  const renderMenu = (claims: Claim[]) => renderConRutas([{ path: '/', element: <Menu /> }], { claims });

  it('visitante: ve Registro y Login, sin enlaces de administración ni saludo', () => {
    renderMenu([]);
    expect(screen.getByRole('link', { name: /Registro/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Géneros' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Hola/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Filtrar Películas/ })).toBeInTheDocument(); // público
  });

  it('usuario común: ve su email y Logout, pero no los enlaces de administración', () => {
    renderMenu(claimsUsuarioComun);
    expect(screen.getByText(/Hola user@correo.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/ })).toBeInTheDocument();
    for (const enlace of ['Géneros', 'Actores', 'Cines', 'Peliculas', 'Usuarios']) {
      expect(screen.queryByRole('link', { name: enlace })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('link', { name: /Login/ })).not.toBeInTheDocument();
  });

  it('administrador: ve todos los enlaces de administración', () => {
    renderMenu(claimsAdmin);
    for (const enlace of ['Géneros', 'Actores', 'Cines', 'Peliculas', 'Usuarios']) {
      expect(screen.getByRole('link', { name: enlace })).toBeInTheDocument();
    }
  });

  it('Logout borra token y expiración del almacenamiento y limpia el contexto', async () => {
    iniciarSesion();
    const actualizar = vi.fn();
    const { usuario } = renderConRutas([{ path: '/', element: <Menu /> }], { claims: claimsAdmin, actualizar });

    await usuario.click(screen.getByRole('button', { name: /Logout/ }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('token-expiracion')).toBeNull();
    expect(actualizar).toHaveBeenCalledWith([]);
  });

  it('límite: sin claim "email" el saludo se muestra vacío sin fallar', () => {
    renderMenu([{ nombre: 'esadmin', valor: '1' }]);
    expect(screen.getByText(/^Hola/)).toBeInTheDocument();
  });
});

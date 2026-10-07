import { describe, expect, it } from 'vitest';
import clienteAPI from '../../api/clienteAxios';
import { api, iniciarSesion } from '../utils/helpers';

describe('clienteAPI (interceptor JWT)', () => {
  it('envía Content-Type JSON por defecto', () => {
    expect(clienteAPI.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('adjunta Authorization: Bearer <token> cuando hay sesión', async () => {
    const { token } = iniciarSesion();
    api.onGet('/generos').reply(config => [200, { auth: config.headers?.Authorization }]);

    const { data } = await clienteAPI.get('/generos');

    expect(data.auth).toBe(`Bearer ${token}`);
  });

  it('no envía Authorization cuando no hay token', async () => {
    api.onGet('/generos').reply(config => [200, { auth: config.headers?.Authorization ?? null }]);

    const { data } = await clienteAPI.get('/generos');

    expect(data.auth).toBeNull();
  });

  it('lee el token en cada petición (refleja un login posterior sin recrear el cliente)', async () => {
    api.onGet('/x').reply(config => [200, { auth: config.headers?.Authorization ?? null }]);
    expect((await clienteAPI.get('/x')).data.auth).toBeNull();

    const { token } = iniciarSesion();

    expect((await clienteAPI.get('/x')).data.auth).toBe(`Bearer ${token}`);
  });

  it('envía el token almacenado sin validar su expiración (comportamiento actual: el servidor responderá 401)', async () => {
    const { token } = iniciarSesion({ email: 'a@b.com' }, -60_000);
    api.onGet('/x').reply(config => [200, { auth: config.headers?.Authorization }]);

    expect((await clienteAPI.get('/x')).data.auth).toBe(`Bearer ${token}`);
  });

  it('propaga el error HTTP (p. ej. 401) al llamador', async () => {
    api.onGet('/protegido').reply(401);
    await expect(clienteAPI.get('/protegido')).rejects.toMatchObject({ response: { status: 401 } });
  });
});

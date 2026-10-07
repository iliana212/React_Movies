import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  guardarTokenLocalStorage, obtenerClaims, obtenerToken, Logout, usuarioLogueado,
} from '../../features/seguridad/utilidades/ManejadorJWT';
import { crearJWT, iniciarSesion } from '../utils/helpers';

describe('ManejadorJWT', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('guardarTokenLocalStorage / obtenerToken', () => {
    it('guarda el token y la expiración en localStorage', () => {
      const expiracion = new Date('2030-01-01T00:00:00Z');
      guardarTokenLocalStorage({ token: 'abc.def.ghi', expiracion });

      expect(localStorage.getItem('token')).toBe('abc.def.ghi');
      expect(localStorage.getItem('token-expiracion')).toBe(expiracion.toString());
    });

    it('obtenerToken devuelve el token almacenado', () => {
      localStorage.setItem('token', 'xyz');
      expect(obtenerToken()).toBe('xyz');
    });

    it('obtenerToken devuelve null cuando no hay sesión', () => {
      expect(obtenerToken()).toBeNull();
    });
  });

  describe('obtenerClaims', () => {
    it('devuelve los claims del payload cuando el token es válido y vigente', () => {
      iniciarSesion({ email: 'ana@correo.com', esadmin: '1' });

      expect(obtenerClaims()).toEqual([
        { nombre: 'email', valor: 'ana@correo.com' },
        { nombre: 'esadmin', valor: '1' },
      ]);
    });

    it('convierte a string los valores no textuales del payload (número, booleano, arreglo)', () => {
      iniciarSesion({ exp: 1893456000, activo: true, roles: ['a', 'b'] });

      expect(obtenerClaims()).toEqual([
        { nombre: 'exp', valor: '1893456000' },
        { nombre: 'activo', valor: 'true' },
        { nombre: 'roles', valor: 'a,b' },
      ]);
    });

    it('devuelve [] cuando no hay token', () => {
      localStorage.setItem('token-expiracion', new Date(Date.now() + 60_000).toISOString());
      expect(obtenerClaims()).toEqual([]);
    });

    it('devuelve [] cuando no hay fecha de expiración', () => {
      localStorage.setItem('token', crearJWT({ email: 'a@b.com' }));
      expect(obtenerClaims()).toEqual([]);
    });

    it('devuelve [] y cierra la sesión cuando el token ya expiró', () => {
      iniciarSesion({ email: 'a@b.com' }, -1000);

      expect(obtenerClaims()).toEqual([]);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('token-expiracion')).toBeNull();
    });

    it('trata como expirado un token cuya expiración es exactamente "ahora" (límite <=)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-01T12:00:00Z'));
      localStorage.setItem('token', crearJWT({ email: 'a@b.com' }));
      localStorage.setItem('token-expiracion', '2026-05-01T12:00:00Z');

      expect(obtenerClaims()).toEqual([]);
    });

    it('mantiene vigente un token que expira 1 ms en el futuro', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));
      localStorage.setItem('token', crearJWT({ email: 'a@b.com' }));
      localStorage.setItem('token-expiracion', '2026-05-01T12:00:00.001Z');

      expect(obtenerClaims()).toHaveLength(1);
    });

    it('devuelve [] y limpia el storage cuando la expiración no es una fecha válida', () => {
      localStorage.setItem('token', crearJWT({ email: 'a@b.com' }));
      localStorage.setItem('token-expiracion', 'no-es-una-fecha');

      expect(obtenerClaims()).toEqual([]);
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('devuelve [] y limpia el storage cuando el token no tiene payload (sin puntos)', () => {
      localStorage.setItem('token', 'tokensinpuntos');
      localStorage.setItem('token-expiracion', new Date(Date.now() + 60_000).toISOString());

      expect(obtenerClaims()).toEqual([]);
      expect(localStorage.getItem('token')).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('devuelve [] y limpia el storage cuando el payload no es JSON válido', () => {
      localStorage.setItem('token', `cabecera.${btoa('esto no es json')}.firma`);
      localStorage.setItem('token-expiracion', new Date(Date.now() + 60_000).toISOString());

      expect(obtenerClaims()).toEqual([]);
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('devuelve [] cuando el payload es un objeto vacío', () => {
      iniciarSesion({});
      expect(obtenerClaims()).toEqual([]);
    });

    it('DEBERÍA decodificar un payload en base64url (contiene "_" o "-")', () => {
      const payload = { nombre: '???>>>' }; // su base64 estándar contiene '/' y '+', que en base64url pasan a '_' y '-'
      const b64 = btoa(JSON.stringify(payload));
      const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(b64url).toMatch(/[-_]/);
      localStorage.setItem('token', `cab.${b64url}.firma`);
      localStorage.setItem('token-expiracion', new Date(Date.now() + 60_000).toISOString());

      expect(obtenerClaims()).toEqual([{ nombre: 'nombre', valor: '???>>>' }]);
    });
  });

  describe('Logout / usuarioLogueado', () => {
    it('Logout elimina token y expiración pero no otras llaves', () => {
      iniciarSesion();
      localStorage.setItem('otra-llave', 'se-conserva');

      Logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('token-expiracion')).toBeNull();
      expect(localStorage.getItem('otra-llave')).toBe('se-conserva');
    });

    it('Logout no falla si no había sesión', () => {
      expect(() => Logout()).not.toThrow();
    });

    it('usuarioLogueado es true con una sesión vigente', () => {
      iniciarSesion();
      expect(usuarioLogueado()).toBe(true);
    });

    it('usuarioLogueado es false sin sesión', () => {
      expect(usuarioLogueado()).toBe(false);
    });

    it('usuarioLogueado es false con sesión expirada', () => {
      iniciarSesion({ email: 'a@b.com' }, -5000);
      expect(usuarioLogueado()).toBe(false);
    });
  });
});

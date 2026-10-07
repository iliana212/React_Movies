import { describe, expect, it } from 'vitest';
import * as yup from 'yup';
import type { AxiosError } from 'axios';
import { extraerErrores } from '../../utilidades/extraerErrores';
import ExtraerErroresIdentity from '../../features/seguridad/utilidades/ExtraerErroresIdentity';
import formatearFecha from '../../utilidades/formatearFecha';
import { fechaNoFutura, primeraLetraMayus } from '../../validaciones/Validaciones';
import ConvertirPeliculaAFormData from '../../features/peliculas/utilidades/convertirAFormData';
import { actorCarrie, actorKeanu, fechaISO } from '../utils/fixtures';

const errorConRespuesta = (data: unknown) => ({ response: { data } }) as AxiosError;
const errorDeRed = () => ({ message: 'Network Error' }) as AxiosError; // sin `response`

describe('extraerErrores (validación de ASP.NET: { errors: { campo: [mensajes] } })', () => {
  it('aplana los errores como "campo: mensaje"', () => {
    const err = errorConRespuesta({ errors: { Nombre: ['Es requerido'], Fecha: ['Inválida'] } });
    expect(extraerErrores(err)).toEqual(['Nombre: Es requerido', 'Fecha: Inválida']);
  });

  it('conserva todos los mensajes cuando un mismo campo tiene varios', () => {
    const err = errorConRespuesta({ errors: { Titulo: ['Muy corto', 'Ya existe'] } });
    expect(extraerErrores(err)).toEqual(['Titulo: Muy corto', 'Titulo: Ya existe']);
  });

  it('devuelve [] cuando errors está vacío', () => {
    expect(extraerErrores(errorConRespuesta({ errors: {} }))).toEqual([]);
  });

  it('devuelve [] cuando la respuesta no trae la propiedad errors (p. ej. un 500 genérico)', () => {
    expect(extraerErrores(errorConRespuesta({ title: 'Internal Server Error' }))).toEqual([]);
  });

  it('DEBERÍA devolver [] cuando no hay respuesta del servidor (error de red)', () => {
    expect(extraerErrores(errorDeRed())).toEqual([]);
  });
});

describe('ExtraerErroresIdentity (ASP.NET Identity: [{ code, description }])', () => {
  it('devuelve las descripciones de cada error', () => {
    const err = errorConRespuesta([
      { code: 'DuplicateUserName', description: 'El usuario ya existe' },
      { code: 'PasswordTooShort', description: 'Contraseña muy corta' },
    ]);
    expect(ExtraerErroresIdentity(err)).toEqual(['El usuario ya existe', 'Contraseña muy corta']);
  });

  it('devuelve [] cuando el arreglo de errores está vacío', () => {
    expect(ExtraerErroresIdentity(errorConRespuesta([]))).toEqual([]);
  });

  it('DEBERÍA devolver [] cuando no hay respuesta del servidor (error de red)', () => {
    expect(ExtraerErroresIdentity(errorDeRed())).toEqual([]);
  });
});

describe('formatearFecha', () => {
  it('convierte una fecha ISO con hora a yyyy-mm-dd', () => {
    expect(formatearFecha('1999-03-31T00:00:00Z')).toBe('1999-03-31');
  });

  it('deja intacta una fecha sin hora', () => {
    expect(formatearFecha('2024-02-29')).toBe('2024-02-29');
  });

  it('normaliza a UTC: una hora tardía con offset negativo cae en el día siguiente', () => {
    expect(formatearFecha('2026-01-01T23:30:00-06:00')).toBe('2026-01-02');
  });

  it('lanza RangeError con una fecha inválida', () => {
    expect(() => formatearFecha('no-es-fecha')).toThrow(RangeError);
  });

  it('lanza RangeError con una cadena vacía', () => {
    expect(() => formatearFecha('')).toThrow(RangeError);
  });
});

describe('Validaciones', () => {
  describe('primeraLetraMayus', () => {
    const { test, message, name } = primeraLetraMayus();

    it('expone nombre y mensaje esperados', () => {
      expect(name).toBe('primera-letra-mayus');
      expect(message).toBe('La primera letra debe ser mayúscula');
    });

    it.each(['Acción', 'Ñandú', 'A', 'ÁRBOL'])('acepta "%s"', valor => {
      expect(test(valor)).toBe(true);
    });

    it.each(['acción', 'ñandú', 'a'])('rechaza "%s"', valor => {
      expect(test(valor)).toBe(false);
    });

    it('acepta vacío o undefined (la obligatoriedad la valida required)', () => {
      expect(test('')).toBe(true);
      expect(test(undefined)).toBe(true);
    });

    it('acepta cadenas que inician con un carácter sin mayúscula/minúscula (dígito o símbolo)', () => {
      expect(test('3 Idiotas')).toBe(true);
      expect(test('¿Quién?')).toBe(true);
    });

    it('integrada en un esquema yup produce el mensaje de error', async () => {
      const esquema = yup.object({ nombre: yup.string().required().test(primeraLetraMayus()) });
      await expect(esquema.validate({ nombre: 'drama' })).rejects.toThrow('La primera letra debe ser mayúscula');
      await expect(esquema.validate({ nombre: 'Drama' })).resolves.toEqual({ nombre: 'Drama' });
    });
  });

  describe('fechaNoFutura', () => {
    const { test, message } = fechaNoFutura();

    it('expone el mensaje esperado', () => {
      expect(message).toBe('La fecha no puede ser del futuro');
    });

    it('acepta una fecha pasada', () => {
      expect(test('1990-05-17')).toBe(true);
    });

    it('acepta el día de hoy (límite)', () => {
      expect(test(fechaISO(0))).toBe(true);
    });

    it('rechaza el día de mañana', () => {
      expect(test(fechaISO(1))).toBe(false);
    });

    it('acepta vacío o undefined (la obligatoriedad la valida required)', () => {
      expect(test(undefined)).toBe(true);
      expect(test('')).toBe(true);
    });

    it('rechaza una cadena que no es fecha (Invalid Date no es <= hoy)', () => {
      expect(test('no-es-fecha')).toBe(false);
    });
  });
});

describe('ConvertirPeliculaAFormData', () => {
  it('serializa los campos escalares y los arreglos como JSON', () => {
    const fd = ConvertirPeliculaAFormData({
      titulo: 'Matrix',
      fechaLanzamiento: '1999-03-31',
      trailer: 'https://youtu.be/x',
      generosIds: [1, 2],
      cinesIds: [10],
      actores: [actorKeanu, actorCarrie],
    });

    expect(fd.get('titulo')).toBe('Matrix');
    expect(fd.get('fechaLanzamiento')).toBe('1999-03-31');
    expect(fd.get('trailer')).toBe('https://youtu.be/x');
    expect(JSON.parse(fd.get('generosIds') as string)).toEqual([1, 2]);
    expect(JSON.parse(fd.get('cinesIds') as string)).toEqual([10]);
    expect(JSON.parse(fd.get('actores') as string)).toEqual([actorKeanu, actorCarrie]);
  });

  it('adjunta el poster cuando es un archivo', () => {
    const poster = new File(['img'], 'poster.png', { type: 'image/png' });
    const fd = ConvertirPeliculaAFormData({ titulo: 'X', fechaLanzamiento: '2020-01-01', poster });

    const adjunto = fd.get('poster') as File;
    expect(adjunto).toBeInstanceOf(File);
    expect(adjunto.name).toBe('poster.png');
  });

  it('adjunta el poster como texto cuando es la URL de la imagen actual (edición)', () => {
    const fd = ConvertirPeliculaAFormData({ titulo: 'X', fechaLanzamiento: '2020-01-01', poster: 'https://img/p.jpg' });
    expect(fd.get('poster')).toBe('https://img/p.jpg');
  });

  it('omite poster y trailer cuando no se proporcionan o están vacíos', () => {
    const fd = ConvertirPeliculaAFormData({ titulo: 'X', fechaLanzamiento: '2020-01-01', trailer: '' });
    expect(fd.has('poster')).toBe(false);
    expect(fd.has('trailer')).toBe(false);
  });

  it('usa "[]" para generos, cines y actores cuando son undefined', () => {
    const fd = ConvertirPeliculaAFormData({ titulo: 'X', fechaLanzamiento: '2020-01-01' });
    expect(fd.get('generosIds')).toBe('[]');
    expect(fd.get('cinesIds')).toBe('[]');
    expect(fd.get('actores')).toBe('[]');
  });
});

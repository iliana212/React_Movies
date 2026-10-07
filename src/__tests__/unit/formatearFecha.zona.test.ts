import { afterEach, describe, expect, it } from 'vitest';
import formatearFecha from '../../utilidades/formatearFecha';

const zonaOriginal = process.env.TZ;
afterEach(() => {
  if (zonaOriginal === undefined) delete process.env.TZ;
  else process.env.TZ = zonaOriginal;
});

describe('formatearFecha según la zona horaria del navegador', () => {
  it.each(['America/Mexico_City', 'UTC', 'America/Los_Angeles'])('en %s una fecha sin zona conserva el día', zona => {
    process.env.TZ = zona;
    expect(formatearFecha('1999-03-31T00:00:00')).toBe('1999-03-31');
  });

  it('DEBERÍA conservar el día en zonas al este de UTC (Asia/Tokyo)', () => {
    process.env.TZ = 'Asia/Tokyo';
    expect(formatearFecha('1999-03-31T00:00:00')).toBe('1999-03-31');
  });
});

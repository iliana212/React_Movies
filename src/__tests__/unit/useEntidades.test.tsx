import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEntidades } from '../../hooks/useEntidades';
import { api, capturarRechazosNoManejados, responderListado } from '../utils/helpers';
import { generos } from '../utils/fixtures';
import type Genero from '../../features/generos/modelos/Genero.model';

const peticionesGet = () => api.history.get;

describe('useEntidades', () => {
  describe('casos normales', () => {
    it('inicia cargando, pide la página 1 con 3 registros y expone datos y total del encabezado', async () => {
      responderListado('/generos', generos, 7);
      const { result } = renderHook(() => useEntidades<Genero>('/generos'));

      expect(result.current.cargando).toBe(true);
      expect(result.current.entidades).toBeUndefined();

      await waitFor(() => expect(result.current.cargando).toBe(false));
      expect(result.current.entidades).toEqual(generos);
      expect(result.current.cantidadTotalRegistros).toBe(7);
      expect(peticionesGet()).toHaveLength(1);
      expect(peticionesGet()[0].params).toEqual({ pagina: 1, recordsPorPagina: 3 });
    });

    it('setPagina dispara una nueva petición con la página indicada', async () => {
      responderListado('/generos', generos, 9);
      const { result } = renderHook(() => useEntidades<Genero>('/generos'));
      await waitFor(() => expect(result.current.cargando).toBe(false));

      act(() => result.current.setPagina(2));

      await waitFor(() => expect(peticionesGet()).toHaveLength(2));
      expect(peticionesGet()[1].params).toEqual({ pagina: 2, recordsPorPagina: 3 });
      await waitFor(() => expect(result.current.cargando).toBe(false));
      expect(result.current.pagina).toBe(2);
    });

    it('setRecordsPorPagina dispara una nueva petición con el nuevo tamaño', async () => {
      responderListado('/generos', generos, 9);
      const { result } = renderHook(() => useEntidades<Genero>('/generos'));
      await waitFor(() => expect(result.current.cargando).toBe(false));

      act(() => result.current.setRecordsPorPagina(10));

      await waitFor(() => expect(peticionesGet()).toHaveLength(2));
      expect(peticionesGet()[1].params).toEqual({ pagina: 1, recordsPorPagina: 10 });
    });

    it('cargarRegistros vuelve a consultar y refleja los datos nuevos', async () => {
      responderListado('/generos', [generos[0]], 1);
      const { result } = renderHook(() => useEntidades<Genero>('/generos'));
      await waitFor(() => expect(result.current.entidades).toEqual([generos[0]]));

      responderListado('/generos', generos, 3);
      act(() => result.current.cargarRegistros());

      await waitFor(() => expect(result.current.entidades).toEqual(generos));
      expect(result.current.cantidadTotalRegistros).toBe(3);
    });

    it('cambiar la url del hook consulta el nuevo recurso', async () => {
      responderListado('/generos', generos, 3);
      responderListado('/actores', [], 0);
      const { result, rerender } = renderHook(({ url }) => useEntidades<Genero>(url), { initialProps: { url: '/generos' } });
      await waitFor(() => expect(result.current.cargando).toBe(false));

      rerender({ url: '/actores' });

      await waitFor(() => expect(peticionesGet().map(p => p.url)).toEqual(['/generos', '/actores']));
    });
  });

  describe('casos límite', () => {
    it('una lista vacía con total 0 deja de cargar y devuelve []', async () => {
      responderListado('/generos', [], 0);
      const { result } = renderHook(() => useEntidades<Genero>('/generos'));
      await waitFor(() => expect(result.current.cargando).toBe(false));
      expect(result.current.entidades).toEqual([]);
      expect(result.current.cantidadTotalRegistros).toBe(0);
    });

    it('vuelve a poner cargando=true mientras recarga', async () => {
      responderListado('/generos', generos, 3);
      const { result } = renderHook(() => useEntidades<Genero>('/generos'));
      await waitFor(() => expect(result.current.cargando).toBe(false));

      act(() => result.current.cargarRegistros());
      expect(result.current.cargando).toBe(true);
      await waitFor(() => expect(result.current.cargando).toBe(false));
    });
  });

  describe('escenarios de falla / hallazgos', () => {
    it('DEBERÍA usar 0 como total cuando el encabezado no viene en la respuesta', async () => {
      api.onGet('/generos').reply(200, generos);
      const { result } = renderHook(() => useEntidades<Genero>('/generos'));
      await waitFor(() => expect(result.current.cargando).toBe(false));
      expect(result.current.cantidadTotalRegistros).toBe(0);
    });

    it('DEBERÍA salir del estado "cargando" y no dejar rechazos sin manejar cuando la API falla', async () => {
      api.onGet('/generos').networkError();
      let cargando = true;
      const rechazos = await capturarRechazosNoManejados(async () => {
        const { result } = renderHook(() => useEntidades<Genero>('/generos'));
        await new Promise(r => setTimeout(r, 30));
        cargando = result.current.cargando;
      });
      expect(rechazos).toHaveLength(0);
      expect(cargando).toBe(false);
    });
  });
});

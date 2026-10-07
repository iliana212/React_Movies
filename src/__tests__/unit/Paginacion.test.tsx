import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Paginacion from '../../componentes/Paginacion';

/** Renderiza Paginacion con valores por defecto sobreescribibles. */
function renderizar(props: Partial<React.ComponentProps<typeof Paginacion>> = {}) {
  const onCambioPaginacion = vi.fn();
  const usuario = userEvent.setup();
  render(
    <Paginacion
      paginaActual={1}
      registrosPorPagina={3}
      cantidadTotalRegistros={10}
      registrosPorPaginasOpciones={[5, 10, 30]}
      onCambioPaginacion={onCambioPaginacion}
      {...props}
    />,
  );
  return { usuario, onCambioPaginacion };
}

/** Números de página visibles (excluye « y »). */
const paginasVisibles = () =>
  screen.getAllByRole('button').map(b => b.textContent!).filter(t => /^\d+$/.test(t)).map(Number);

const itemDe = (nombre: string) => screen.getByRole('button', { name: nombre }).closest('li')!;

describe('Paginacion', () => {
  describe('casos normales', () => {
    it('calcula el total de páginas con redondeo hacia arriba (10 registros / 3 = 4 páginas)', () => {
      renderizar({ paginaActual: 2, cantidadTotalRegistros: 10, registrosPorPagina: 3 });
      expect(paginasVisibles()).toEqual([1, 2, 3, 4]);
    });

    it('marca como activa únicamente la página actual', () => {
      renderizar({ paginaActual: 2 });
      expect(screen.getByRole('button', { name: '2' }).closest('li')).toHaveClass('active');
      expect(screen.getByRole('button', { name: '1' }).closest('li')).not.toHaveClass('active');
    });

    it('al pulsar un número notifica (página, registrosPorPagina) actuales', async () => {
      const { usuario, onCambioPaginacion } = renderizar();
      await usuario.click(screen.getByRole('button', { name: '3' }));
      expect(onCambioPaginacion).toHaveBeenCalledWith(3, 3);
    });

    it('» avanza una página y « retrocede una', async () => {
      const { usuario, onCambioPaginacion } = renderizar({ paginaActual: 2 });
      await usuario.click(screen.getByRole('button', { name: '»' }));
      await usuario.click(screen.getByRole('button', { name: '«' }));
      expect(onCambioPaginacion).toHaveBeenNthCalledWith(1, 3, 3);
      expect(onCambioPaginacion).toHaveBeenNthCalledWith(2, 1, 3);
    });

    it('cambiar "Registros por página" regresa a la página 1 con el nuevo tamaño', async () => {
      const { usuario, onCambioPaginacion } = renderizar({ paginaActual: 3 });
      await usuario.selectOptions(screen.getByRole('combobox'), '10');
      expect(onCambioPaginacion).toHaveBeenCalledWith(1, 10);
    });

    it('preselecciona en el combo el tamaño de página actual', () => {
      renderizar({ registrosPorPagina: 10 });
      expect(screen.getByRole('combobox')).toHaveValue('10');
    });
  });

  describe('casos límite', () => {
    it('muestra una ventana de 5 páginas centrada en la actual (5 ± 2 de 20)', () => {
      renderizar({ paginaActual: 5, cantidadTotalRegistros: 100, registrosPorPagina: 5 });
      expect(paginasVisibles()).toEqual([3, 4, 5, 6, 7]);
    });

    it('en la primera página la ventana se recorta a la izquierda (1..3)', () => {
      renderizar({ paginaActual: 1, cantidadTotalRegistros: 100, registrosPorPagina: 5 });
      expect(paginasVisibles()).toEqual([1, 2, 3]);
    });

    it('en la última página la ventana se recorta a la derecha', () => {
      renderizar({ paginaActual: 20, cantidadTotalRegistros: 100, registrosPorPagina: 5 });
      expect(paginasVisibles()).toEqual([18, 19, 20]);
    });

    it('un total exacto múltiplo del tamaño no genera una página extra (9 / 3 = 3)', () => {
      renderizar({ cantidadTotalRegistros: 9, registrosPorPagina: 3 });
      expect(paginasVisibles()).toEqual([1, 2, 3]);
    });

    it('con una sola página « y » se marcan deshabilitados', () => {
      renderizar({ cantidadTotalRegistros: 2, registrosPorPagina: 3 });
      expect(itemDe('«')).toHaveClass('disabled');
      expect(itemDe('»')).toHaveClass('disabled');
    });

    it('en la primera página « está deshabilitado y » habilitado', () => {
      renderizar({ paginaActual: 1 });
      expect(itemDe('«')).toHaveClass('disabled');
      expect(itemDe('»')).not.toHaveClass('disabled');
    });

    it('en la última página » está deshabilitado', () => {
      renderizar({ paginaActual: 4 });
      expect(itemDe('»')).toHaveClass('disabled');
    });

    it('sin registros no muestra ningún número de página', () => {
      renderizar({ cantidadTotalRegistros: 0 });
      expect(paginasVisibles()).toEqual([]);
    });
  });

  describe('escenarios de falla / hallazgos', () => {
    // HALLAZGO: la clase "disabled" es solo estilo; el <button> nunca lleva el atributo `disabled`.
    // Bootstrap bloquea el clic con `pointer-events: none`, pero el teclado (Tab + Enter) sigue activándolo.
    it('DEBERÍA no notificar la página 0 al activar « en la primera página', async () => {
      const { usuario, onCambioPaginacion } = renderizar({ paginaActual: 1 });
      await usuario.click(screen.getByRole('button', { name: '«' }));
      expect(onCambioPaginacion).not.toHaveBeenCalled();
    });

    it('DEBERÍA no notificar una página inexistente al activar » en la última página', async () => {
      const { usuario, onCambioPaginacion } = renderizar({ paginaActual: 4 });
      await usuario.click(screen.getByRole('button', { name: '»' }));
      expect(onCambioPaginacion).not.toHaveBeenCalled();
    });

    // HALLAZGO: con 0 registros totalPaginas = 0 y la página actual (1) nunca lo iguala, así que » queda habilitado.
    it('DEBERÍA deshabilitar » cuando no hay registros', () => {
      renderizar({ cantidadTotalRegistros: 0 });
      expect(itemDe('»')).toHaveClass('disabled');
    });

    // HALLAZGO: si el backend no envía el encabezado, useEntidades entrega NaN y no se dibuja ninguna página.
    it('con un total NaN (encabezado ausente) no rompe y no dibuja páginas', () => {
      renderizar({ cantidadTotalRegistros: NaN });
      expect(paginasVisibles()).toEqual([]);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Swal from 'sweetalert2';
import Rating from '../../componentes/Rating/Rating';
import { iniciarSesion } from '../utils/helpers';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));

function renderizar(props: { maximoValor?: number; valorSeleccionado?: number } = {}) {
  const onChange = vi.fn();
  const usuario = userEvent.setup();
  const utils = render(<Rating maximoValor={props.maximoValor ?? 5} valorSeleccionado={props.valorSeleccionado ?? 0} onChange={onChange} />);
  const estrellas = () => Array.from(utils.container.querySelectorAll('i.bi-star-fill'));
  const marcadas = () => estrellas().filter(e => e.classList.contains('checked')).length;
  return { usuario, onChange, estrellas, marcadas, ...utils };
}

describe('Rating', () => {
  beforeEach(() => vi.mocked(Swal.fire).mockClear());

  describe('casos normales', () => {
    it('dibuja tantas estrellas como maximoValor', () => {
      const { estrellas } = renderizar({ maximoValor: 5 });
      expect(estrellas()).toHaveLength(5);
    });

    it('marca las estrellas del voto previo del usuario', () => {
      const { marcadas } = renderizar({ valorSeleccionado: 3 });
      expect(marcadas()).toBe(3);
    });

    it('al pasar el mouse resalta hasta la estrella señalada y al salir regresa al voto guardado', async () => {
      const { usuario, estrellas, marcadas } = renderizar({ valorSeleccionado: 2 });
      await usuario.hover(estrellas()[3]);
      expect(marcadas()).toBe(4);
      await usuario.unhover(estrellas()[3]);
      expect(marcadas()).toBe(2);
    });

    it('con sesión activa, al hacer clic notifica el voto y lo conserva al quitar el mouse', async () => {
      iniciarSesion();
      const { usuario, onChange, estrellas, marcadas } = renderizar();
      await usuario.click(estrellas()[3]);
      expect(onChange).toHaveBeenCalledWith(4);
      await usuario.unhover(estrellas()[3]);
      expect(marcadas()).toBe(4);
      expect(Swal.fire).not.toHaveBeenCalled();
    });
  });

  describe('casos límite', () => {
    it('maximoValor 0 no dibuja estrellas', () => {
      const { estrellas } = renderizar({ maximoValor: 0 });
      expect(estrellas()).toHaveLength(0);
    });

    it('un valor seleccionado mayor al máximo marca todas las estrellas sin fallar', () => {
      const { marcadas } = renderizar({ maximoValor: 5, valorSeleccionado: 7 });
      expect(marcadas()).toBe(5);
    });

    it('al cambiar maximoValor se redibujan las estrellas', () => {
      const { rerender, estrellas } = renderizar({ maximoValor: 5 });
      rerender(<Rating maximoValor={3} valorSeleccionado={0} onChange={vi.fn()} />);
      expect(estrellas()).toHaveLength(3);
    });

    it('votar la primera y la última estrella envía 1 y 5', async () => {
      iniciarSesion();
      const { usuario, onChange, estrellas } = renderizar();
      await usuario.click(estrellas()[0]);
      await usuario.click(estrellas()[4]);
      expect(onChange).toHaveBeenNthCalledWith(1, 1);
      expect(onChange).toHaveBeenNthCalledWith(2, 5);
    });
  });

  describe('escenarios de falla', () => {
    it('sin sesión muestra el aviso "Debes loguearte para votar" y no notifica el voto', async () => {
      const { usuario, onChange, estrellas, marcadas } = renderizar();
      await usuario.click(estrellas()[2]);
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error', text: 'Debes loguearte para votar' }));
      expect(onChange).not.toHaveBeenCalled();
      await usuario.unhover(estrellas()[2]);
      expect(marcadas()).toBe(0); // el voto no queda registrado en la UI
    });

    it('con un token expirado se trata como usuario sin sesión', async () => {
      iniciarSesion({ email: 'a@a.com' }, -1000);
      const { usuario, onChange, estrellas } = renderizar();
      await usuario.click(estrellas()[0]);
      expect(Swal.fire).toHaveBeenCalledOnce();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('con un token corrupto se trata como usuario sin sesión', async () => {
      localStorage.setItem('token', 'basura');
      localStorage.setItem('token-expiracion', new Date(Date.now() + 60_000).toISOString());
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { usuario, onChange, estrellas } = renderizar();
      await usuario.click(estrellas()[0]);
      expect(Swal.fire).toHaveBeenCalledOnce();
      expect(onChange).not.toHaveBeenCalled();
      consola.mockRestore();
    });
  });
});

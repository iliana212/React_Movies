import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import Swal from 'sweetalert2';
import IndiceUsuarios from '../../features/seguridad/componentes/IndiceUsuarios';
import { api, capturarRechazosNoManejados, renderConRutas, responderListado } from '../utils/helpers';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));

const usuarios = [{ email: 'ana@correo.com' }, { email: 'luis@correo.com' }];
const fila = (email: string) => screen.getByRole('row', { name: new RegExp(email) });
const abrir = () => renderConRutas([{ path: '/usuarios', element: <IndiceUsuarios /> }], { ruta: '/usuarios' });
const confirmar = (confirma: boolean) => vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: confirma } as never);

beforeEach(() => {
  vi.mocked(Swal.fire).mockReset();
  confirmar(true);
});

describe('Administración de usuarios — integración (IndiceUsuarios)', () => {
  describe('casos normales', () => {
    it('lista los usuarios desde /usuarios/listadoUsuarios', async () => {
      responderListado('/usuarios/listadoUsuarios', usuarios, 2);
      abrir();
      expect(await screen.findByText('ana@correo.com')).toBeInTheDocument();
      expect(screen.getByText('luis@correo.com')).toBeInTheDocument();
    });

    it('"Hacer Admin" confirmado envía el email y muestra el aviso de éxito', async () => {
      responderListado('/usuarios/listadoUsuarios', usuarios, 2);
      api.onPost('usuarios/hacerAdmin').reply(200);
      const { usuario } = abrir();
      await screen.findByText('ana@correo.com');

      await usuario.click(within(fila('ana@correo.com')).getByRole('button', { name: 'Hacer Admin' }));

      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(api.history.post[0].url).toBe('usuarios/hacerAdmin');
      expect(JSON.parse(api.history.post[0].data)).toEqual({ email: 'ana@correo.com' });
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Deseas hacer admin a: ana@correo.com', confirmButtonText: 'Si' }));
      await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith({ title: 'Exitoso', text: 'Operación realizada con éxito', icon: 'success' }));
    });

    it('"Remover Admin" confirmado usa el endpoint removerAdmin', async () => {
      responderListado('/usuarios/listadoUsuarios', usuarios, 2);
      api.onPost('usuarios/removerAdmin').reply(200);
      const { usuario } = abrir();
      await screen.findByText('luis@correo.com');

      await usuario.click(within(fila('luis@correo.com')).getByRole('button', { name: 'Remover Admin' }));

      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(api.history.post[0].url).toBe('usuarios/removerAdmin');
      expect(JSON.parse(api.history.post[0].data)).toEqual({ email: 'luis@correo.com' });
    });
  });

  describe('casos límite', () => {
    it('si el administrador cancela la confirmación no se envía nada', async () => {
      confirmar(false);
      responderListado('/usuarios/listadoUsuarios', usuarios, 2);
      const { usuario } = abrir();
      await screen.findByText('ana@correo.com');

      await usuario.click(within(fila('ana@correo.com')).getByRole('button', { name: 'Hacer Admin' }));

      await waitFor(() => expect(Swal.fire).toHaveBeenCalledOnce());
      expect(api.history.post).toHaveLength(0);
    });

    it('sin usuarios muestra "No hay elementos para mostrar"', async () => {
      responderListado('/usuarios/listadoUsuarios', [], 0);
      abrir();
      expect(await screen.findByText('No hay elementos para mostrar')).toBeInTheDocument();
    });
  });

  describe('escenarios de falla / hallazgos', () => {
    it('DEBERÍA avisar el error y no dejar rechazos sin manejar cuando el POST falla (403)', async () => {
      responderListado('/usuarios/listadoUsuarios', usuarios, 2);
      api.onPost('usuarios/hacerAdmin').reply(403);
      const { usuario } = abrir();
      await screen.findByText('ana@correo.com');

      const rechazos = await capturarRechazosNoManejados(() =>
        usuario.click(within(fila('ana@correo.com')).getByRole('button', { name: 'Hacer Admin' })));

      expect(api.history.post).toHaveLength(1);
      expect(rechazos).toHaveLength(0);
    });
  });
});

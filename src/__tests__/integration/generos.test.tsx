import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import Swal from 'sweetalert2';
import IndiceGeneros from '../../features/generos/componentes/IndiceGeneros';
import CrearGenero from '../../features/generos/componentes/CrearGenero';
import EditarGenero from '../../features/generos/componentes/EditarGenero';
import { api, capturarRechazosNoManejados, renderConRutas, responderListado, ubicacionActual } from '../utils/helpers';
import { generos } from '../utils/fixtures';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));

const rutas = [
  { path: '/generos', element: <IndiceGeneros /> },
  { path: '/generos/crear', element: <CrearGenero /> },
  { path: '/generos/editar/:id', element: <EditarGenero /> },
];

const confirmarBorrado = (confirma: boolean) => vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: confirma } as never);
const fila = (nombre: string) => screen.getByRole('row', { name: new RegExp(nombre) });
const botonEnviar = () => screen.getByRole('button', { name: 'Enviar' });

beforeEach(() => {
  vi.mocked(Swal.fire).mockReset();
  confirmarBorrado(true);
});

describe('Géneros — listado (IndiceGeneros + useEntidades + Paginacion)', () => {
  describe('casos normales', () => {
    it('muestra "cargando" y después los géneros con sus acciones, pidiendo la página 1 de 3 registros', async () => {
      responderListado('/generos', generos, 3);
      renderConRutas(rutas, { ruta: '/generos' });

      expect(screen.getByAltText('loading')).toBeInTheDocument();
      expect(await screen.findByText('Acción')).toBeInTheDocument();
      expect(screen.getByText('Drama')).toBeInTheDocument();
      expect(screen.getByText('Comedia')).toBeInTheDocument();
      expect(within(fila('Drama')).getByRole('button', { name: /Editar/ })).toBeInTheDocument();
      expect(within(fila('Drama')).getByRole('button', { name: /Borrar/ })).toBeInTheDocument();
      expect(api.history.get[0].params).toEqual({ pagina: 1, recordsPorPagina: 3 });
    });

    it('cambiar de página vuelve a consultar con esa página', async () => {
      responderListado('/generos', generos, 7);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos' });
      await screen.findByText('Acción');

      await usuario.click(screen.getByRole('button', { name: '2' }));

      await waitFor(() => expect(api.history.get).toHaveLength(2));
      expect(api.history.get[1].params).toEqual({ pagina: 2, recordsPorPagina: 3 });
    });

    it('cambiar "Registros por página" consulta la página 1 con el nuevo tamaño', async () => {
      responderListado('/generos', generos, 7);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos' });
      await screen.findByText('Acción');

      await usuario.selectOptions(screen.getByRole('combobox'), '10');

      await waitFor(() => expect(api.history.get).toHaveLength(2));
      expect(api.history.get[1].params).toEqual({ pagina: 1, recordsPorPagina: 10 });
    });

    it('"+ Crear Género" navega al formulario de creación', async () => {
      responderListado('/generos', generos, 3);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos' });
      await screen.findByText('Acción');

      await usuario.click(screen.getByRole('button', { name: /Crear Género/ }));

      expect(ubicacionActual()).toBe('/generos/crear');
      expect(screen.getByRole('heading', { name: 'Crear Género' })).toBeInTheDocument();
    });

    it('"Editar" navega a /generos/editar/:id del género elegido', async () => {
      responderListado('/generos', generos, 3);
      api.onGet('/generos/2').reply(200, generos[1]);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos' });
      await screen.findByText('Drama');

      await usuario.click(within(fila('Drama')).getByRole('button', { name: /Editar/ }));

      expect(ubicacionActual()).toBe('/generos/editar/2');
    });

    it('"Borrar" confirmado elimina el género y recarga el listado', async () => {
      responderListado('/generos', generos, 3);
      api.onDelete('/generos/1').reply(204);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos' });
      await screen.findByText('Acción');

      await usuario.click(within(fila('Acción')).getByRole('button', { name: /Borrar/ }));

      await waitFor(() => expect(api.history.delete).toHaveLength(1));
      expect(api.history.delete[0].url).toBe('/generos/1');
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Desea borrar el registro?', showCancelButton: true }));
      await waitFor(() => expect(api.history.get).toHaveLength(2)); // recarga
    });
  });

  describe('casos límite', () => {
    it('sin registros muestra "No hay elementos para mostrar"', async () => {
      responderListado('/generos', [], 0);
      renderConRutas(rutas, { ruta: '/generos' });
      expect(await screen.findByText('No hay elementos para mostrar')).toBeInTheDocument();
    });

    it('"Borrar" cancelado no llama a la API ni recarga', async () => {
      confirmarBorrado(false);
      responderListado('/generos', generos, 3);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos' });
      await screen.findByText('Acción');

      await usuario.click(within(fila('Acción')).getByRole('button', { name: /Borrar/ }));

      await waitFor(() => expect(Swal.fire).toHaveBeenCalled());
      expect(api.history.delete).toHaveLength(0);
      expect(api.history.get).toHaveLength(1);
    });

    it('borrar estando en la página 2 regresa a la página 1', async () => {
      responderListado('/generos', generos, 7);
      api.onDelete('/generos/3').reply(204);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos' });
      await screen.findByText('Acción');
      await usuario.click(screen.getByRole('button', { name: '2' }));
      await waitFor(() => expect(api.history.get).toHaveLength(2));
      await screen.findByText('Comedia');

      await usuario.click(within(fila('Comedia')).getByRole('button', { name: /Borrar/ }));

      await waitFor(() => expect(api.history.get).toHaveLength(3));
      expect(api.history.get[2].params).toEqual({ pagina: 1, recordsPorPagina: 3 });
    });
  });

  describe('escenarios de falla', () => {
    it('si el DELETE falla (500) registra el error, no recarga y conserva la lista', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
      responderListado('/generos', generos, 3);
      api.onDelete('/generos/1').reply(500);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos' });
      await screen.findByText('Acción');

      await usuario.click(within(fila('Acción')).getByRole('button', { name: /Borrar/ }));

      await waitFor(() => expect(consola).toHaveBeenCalled());
      expect(api.history.get).toHaveLength(1);
      expect(screen.getByText('Acción')).toBeInTheDocument();
    });

    // HALLAZGO: useEntidades no maneja el rechazo de la petición: la pantalla queda en "cargando" indefinido.
    it('DEBERÍA salir de "cargando" y no dejar rechazos sin manejar si el listado falla (500)', async () => {
      api.onGet('/generos').reply(500);
      const rechazos = await capturarRechazosNoManejados(async () => {
        renderConRutas(rutas, { ruta: '/generos' });
        await new Promise(r => setTimeout(r, 30));
      });
      expect(rechazos).toHaveLength(0);
      expect(screen.queryByAltText('loading')).not.toBeInTheDocument();
    });
  });
});

describe('Géneros — crear (CrearGenero + FormularioGenero)', () => {
  describe('casos normales', () => {
    it('envía el nombre, y al tener éxito navega al listado', async () => {
      api.onPost('/generos').reply(201);
      responderListado('/generos', generos, 3);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/crear' });

      await usuario.type(screen.getByLabelText('Nombre'), 'Terror');
      await usuario.click(botonEnviar());

      await waitFor(() => expect(ubicacionActual()).toBe('/generos'));
      expect(JSON.parse(api.history.post[0].data)).toEqual({ nombre: 'Terror' });
    });

    it('"Cancelar" regresa al listado sin guardar', async () => {
      responderListado('/generos', generos, 3);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/crear' });

      await usuario.click(screen.getByRole('link', { name: 'Cancelar' }));

      expect(ubicacionActual()).toBe('/generos');
      expect(api.history.post).toHaveLength(0);
    });
  });

  describe('casos límite (validación)', () => {
    it('inicia con el botón Enviar deshabilitado', () => {
      renderConRutas(rutas, { ruta: '/generos/crear' });
      expect(botonEnviar()).toBeDisabled();
    });

    it('un nombre en minúscula muestra el error de primera letra y bloquea el envío', async () => {
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/crear' });
      await usuario.type(screen.getByLabelText('Nombre'), 'terror');
      expect(await screen.findByText('La primera letra debe ser mayúscula')).toBeInTheDocument();
      expect(botonEnviar()).toBeDisabled();
    });

    it('vaciar el campo muestra "El nombre es requerido"', async () => {
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/crear' });
      await usuario.type(screen.getByLabelText('Nombre'), 'T');
      await usuario.clear(screen.getByLabelText('Nombre'));
      expect(await screen.findByText('El nombre es requerido')).toBeInTheDocument();
      expect(botonEnviar()).toBeDisabled();
    });

    it.each(['Ñandú', '3D', 'A'])('acepta el nombre límite "%s"', async nombre => {
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/crear' });
      await usuario.type(screen.getByLabelText('Nombre'), nombre);
      await waitFor(() => expect(botonEnviar()).toBeEnabled());
    });

    it('un formulario inválido nunca llega a la API', async () => {
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/crear' });
      await usuario.type(screen.getByLabelText('Nombre'), 'terror{enter}');
      expect(api.history.post).toHaveLength(0);
    });
  });

  describe('escenarios de falla', () => {
    it('400 con errores de validación de ASP.NET: los muestra y permanece en el formulario', async () => {
      api.onPost('/generos').reply(400, { errors: { Nombre: ['Ya existe un género con ese nombre'] } });
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/crear' });

      await usuario.type(screen.getByLabelText('Nombre'), 'Drama');
      await usuario.click(botonEnviar());

      expect(await screen.findByText('Nombre: Ya existe un género con ese nombre')).toBeInTheDocument();
      expect(ubicacionActual()).toBe('/generos/crear');
    });

    it('500 sin cuerpo de errores: no muestra mensajes ni navega', async () => {
      api.onPost('/generos').reply(500, { title: 'Internal Server Error' });
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/crear' });

      await usuario.type(screen.getByLabelText('Nombre'), 'Drama');
      await usuario.click(botonEnviar());

      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      expect(ubicacionActual()).toBe('/generos/crear');
    });

    it('DEBERÍA no producir rechazos no manejados ante un error de red', async () => {
      api.onPost('/generos').networkError();
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/crear' });

      const rechazos = await capturarRechazosNoManejados(async () => {
        await usuario.type(screen.getByLabelText('Nombre'), 'Drama');
        await usuario.click(botonEnviar());
      });

      expect(rechazos).toHaveLength(0);
    });
  });
});

describe('Géneros — editar (EditarGenero + FormularioGenero)', () => {
  describe('casos normales', () => {
    it('carga el género, precarga el formulario y guarda los cambios con PUT', async () => {
      api.onGet('/generos/2').reply(200, generos[1]);
      api.onPut('/generos/2').reply(204);
      responderListado('/generos', generos, 3);
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/editar/2' });

      expect(screen.getByAltText('loading')).toBeInTheDocument();
      const campo = await screen.findByLabelText('Nombre');
      expect(campo).toHaveValue('Drama');
      expect(screen.getByRole('heading', { name: 'Editar Genero 2' })).toBeInTheDocument();

      await usuario.clear(campo);
      await usuario.type(campo, 'Suspenso');
      await usuario.click(botonEnviar());

      await waitFor(() => expect(ubicacionActual()).toBe('/generos'));
      expect(JSON.parse(api.history.put[0].data)).toEqual({ id: 2, nombre: 'Suspenso' });
    });
  });

  describe('casos límite', () => {
    it('un valor precargado inválido (minúscula) bloquea el envío hasta corregirlo', async () => {
      api.onGet('/generos/2').reply(200, { id: 2, nombre: 'drama' });
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/editar/2' });

      const campo = await screen.findByLabelText('Nombre');
      await usuario.type(campo, '!'); // dispara la validación
      expect(await screen.findByText('La primera letra debe ser mayúscula')).toBeInTheDocument();
      expect(botonEnviar()).toBeDisabled();
    });
  });

  describe('escenarios de falla', () => {
    it('si el género no existe (GET 404) redirige al listado', async () => {
      api.onGet('/generos/999').reply(404);
      responderListado('/generos', generos, 3);
      renderConRutas(rutas, { ruta: '/generos/editar/999' });

      await waitFor(() => expect(ubicacionActual()).toBe('/generos'));
    });

    it('si el PUT devuelve 400 muestra los errores y permanece en la pantalla', async () => {
      api.onGet('/generos/2').reply(200, generos[1]);
      api.onPut('/generos/2').reply(400, { errors: { Nombre: ['Nombre duplicado'] } });
      const { usuario } = renderConRutas(rutas, { ruta: '/generos/editar/2' });

      await screen.findByLabelText('Nombre');
      await usuario.click(botonEnviar());

      expect(await screen.findByText('Nombre: Nombre duplicado')).toBeInTheDocument();
      expect(ubicacionActual()).toBe('/generos/editar/2');
    });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import CrearPelicula from '../../features/peliculas/componentes/CrearPelicula';
import EditarPelicula from '../../features/peliculas/componentes/EditarPelicula';
import { api, capturarRechazosNoManejados, renderConRutas, ubicacionActual } from '../utils/helpers';
import { actorCarrie, actorKeanu, cines, crearPelicula, generos } from '../utils/fixtures';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
vi.mock('react-leaflet', () => ({ MapContainer: () => null, Marker: () => null, Popup: () => null, TileLayer: () => null, useMapEvent: vi.fn() }));

const rutas = [
  { path: '/peliculas/crear', element: <CrearPelicula /> },
  { path: '/peliculas/editar/:id', element: <EditarPelicula /> },
  { path: '/peliculas/:id', element: <p>PANTALLA DETALLE</p> },
  { path: '/', element: <p>INICIO</p> },
];

const botonEnviar = () => screen.getByRole('button', { name: 'Enviar' });
/** Lee un campo del FormData enviado en la petición indicada. */
const campo = (peticion: { data?: unknown }, nombre: string) => (peticion.data as FormData).get(nombre);
const json = (peticion: { data?: unknown }, nombre: string) => JSON.parse(campo(peticion, nombre) as string);

// ───────────────────────────── Crear ─────────────────────────────
async function abrirCrear(respuesta: { generos?: unknown[]; cines?: unknown[] } = {}) {
  api.onGet('/peliculas/postget').reply(200, { generos, cines, ...respuesta });
  const utils = renderConRutas(rutas, { ruta: '/peliculas/crear' });
  await screen.findByLabelText('Título');
  return utils;
}

async function llenarBasico(usuario: Awaited<ReturnType<typeof abrirCrear>>['usuario'], titulo = 'Matrix', fecha = '1999-03-31') {
  await usuario.type(screen.getByLabelText('Título'), titulo);
  await usuario.type(screen.getByLabelText('Fecha de Lanzamiento'), fecha);
}

describe('Crear película — integración (CrearPelicula + FormularioPelicula)', () => {
  describe('casos normales', () => {
    it('carga géneros y cines disponibles desde /peliculas/postget', async () => {
      await abrirCrear();
      expect(screen.getByRole('heading', { name: 'Crear Pelicula' })).toBeInTheDocument();
      expect(screen.getByText('Drama')).toBeInTheDocument();
      expect(screen.getByText('Cineteca Norte')).toBeInTheDocument();
    });

    it('envía multipart con título, fecha, trailer, géneros y cines elegidos, y navega al detalle creado', async () => {
      api.onPost('/peliculas').reply(201, crearPelicula({ id: 99 }));
      const { usuario } = await abrirCrear();

      await llenarBasico(usuario);
      await usuario.type(screen.getByLabelText('Trailer (Youtube)'), 'https://www.youtube.com/watch?v=abc');
      await usuario.click(screen.getByText('Acción'));
      await usuario.click(screen.getByText('Cinépolis Centro'));
      await usuario.click(botonEnviar());

      await waitFor(() => expect(ubicacionActual()).toBe('/peliculas/99'));
      const peticion = api.history.post[0];
      expect(peticion.url).toBe('/peliculas');
      expect(campo(peticion, 'titulo')).toBe('Matrix');
      expect(campo(peticion, 'fechaLanzamiento')).toBe('1999-03-31');
      expect(campo(peticion, 'trailer')).toBe('https://www.youtube.com/watch?v=abc');
      expect(json(peticion, 'generosIds')).toEqual([1]);
      expect(json(peticion, 'cinesIds')).toEqual([10]);
      expect(json(peticion, 'actores')).toEqual([]);
    });

    it('permite agregar un actor buscándolo, asignarle personaje y enviarlo', async () => {
      api.onGet('/actores/Kea').reply(200, [{ ...actorKeanu }]);
      api.onPost('/peliculas').reply(201, crearPelicula({ id: 5 }));
      const { usuario } = await abrirCrear();
      await llenarBasico(usuario);

      await usuario.type(screen.getByPlaceholderText('Escriba el nombre del actor...'), 'Kea');
      await usuario.click(await screen.findByRole('option', { name: /Keanu Reeves/ }, { timeout: 3000 }));
      await usuario.type(await screen.findByPlaceholderText('Personaje:'), 'Neo');
      await usuario.click(botonEnviar());

      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(json(api.history.post[0], 'actores')).toEqual([expect.objectContaining({ id: 100, nombre: 'Keanu Reeves', personaje: 'Neo' })]);
    });

    it('al elegir un poster lo envía como archivo en el formulario', async () => {
      api.onPost('/peliculas').reply(201, crearPelicula({ id: 6 }));
      const { usuario, container } = await abrirCrear();
      await llenarBasico(usuario);
      const archivo = new File(['x'], 'poster.png', { type: 'image/png' });

      await usuario.upload(container.querySelector('input[type="file"]') as HTMLInputElement, archivo);
      await usuario.click(botonEnviar());

      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(campo(api.history.post[0], 'poster')).toBeInstanceOf(File);
      expect((campo(api.history.post[0], 'poster') as File).name).toBe('poster.png');
    });
  });

  describe('casos límite', () => {
    it('el botón Enviar inicia deshabilitado y exige título y fecha', async () => {
      const { usuario } = await abrirCrear();
      expect(botonEnviar()).toBeDisabled();

      await usuario.type(screen.getByLabelText('Título'), 'Matrix');
      expect(botonEnviar()).toBeDisabled(); // falta la fecha

      await usuario.type(screen.getByLabelText('Fecha de Lanzamiento'), '1999-03-31');
      await waitFor(() => expect(botonEnviar()).toBeEnabled());
    });

    it('vaciar el título muestra "El titulo es obligatorio"', async () => {
      const { usuario } = await abrirCrear();
      await usuario.type(screen.getByLabelText('Título'), 'M');
      await usuario.clear(screen.getByLabelText('Título'));
      expect(await screen.findByText('El titulo es obligatorio')).toBeInTheDocument();
    });

    it('trailer y poster son opcionales: no se incluyen en el envío si no se capturan', async () => {
      api.onPost('/peliculas').reply(201, crearPelicula({ id: 7 }));
      const { usuario } = await abrirCrear();
      await llenarBasico(usuario);
      await usuario.click(botonEnviar());

      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(campo(api.history.post[0], 'trailer')).toBeNull();
      expect(campo(api.history.post[0], 'poster')).toBeNull();
    });

    it('">>" selecciona todos los géneros y "<<" los devuelve a disponibles', async () => {
      api.onPost('/peliculas').reply(201, crearPelicula({ id: 8 }));
      const { usuario } = await abrirCrear();
      await llenarBasico(usuario);

      await usuario.click(screen.getAllByRole('button', { name: '>>' })[0]);
      await usuario.click(botonEnviar());
      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(json(api.history.post[0], 'generosIds')).toEqual([1, 2, 3]);
    });

    it('un género seleccionado puede volver a deseleccionarse antes de enviar', async () => {
      api.onPost('/peliculas').reply(201, crearPelicula({ id: 9 }));
      const { usuario } = await abrirCrear();
      await llenarBasico(usuario);

      await usuario.click(screen.getByText('Acción'));
      await usuario.click(screen.getByText('Acción')); // ahora está en la lista de seleccionados
      await usuario.click(botonEnviar());

      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(json(api.history.post[0], 'generosIds')).toEqual([]);
    });

    it('sin géneros ni cines disponibles el formulario sigue funcionando', async () => {
      api.onPost('/peliculas').reply(201, crearPelicula({ id: 10 }));
      const { usuario } = await abrirCrear({ generos: [], cines: [] });
      await llenarBasico(usuario);
      await usuario.click(botonEnviar());
      await waitFor(() => expect(ubicacionActual()).toBe('/peliculas/10'));
    });
  });

  describe('escenarios de falla', () => {
    it('400 con errores de validación: los muestra, no navega y permite reintentar', async () => {
      api.onPost('/peliculas').replyOnce(400, { errors: { Titulo: ['El título ya existe'] } });
      api.onPost('/peliculas').replyOnce(201, crearPelicula({ id: 11 }));
      const { usuario } = await abrirCrear();
      await llenarBasico(usuario);

      await usuario.click(botonEnviar());
      expect(await screen.findByText('Titulo: El título ya existe')).toBeInTheDocument();
      expect(ubicacionActual()).toBe('/peliculas/crear');

      await usuario.click(botonEnviar());
      await waitFor(() => expect(ubicacionActual()).toBe('/peliculas/11'));
    });

    it('500 sin cuerpo de errores: no muestra mensajes ni navega', async () => {
      api.onPost('/peliculas').reply(500, { title: 'Internal Server Error' });
      const { usuario } = await abrirCrear();
      await llenarBasico(usuario);

      await usuario.click(botonEnviar());

      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(screen.queryAllByRole('listitem').filter(li => li.closest('ul.error'))).toHaveLength(0);
      expect(ubicacionActual()).toBe('/peliculas/crear');
    });

    it('DEBERÍA manejar el fallo de /peliculas/postget sin rechazos no manejados', async () => {
      api.onGet('/peliculas/postget').reply(500);
      const rechazos = await capturarRechazosNoManejados(async () => {
        renderConRutas(rutas, { ruta: '/peliculas/crear' });
        await new Promise(r => setTimeout(r, 30));
      });
      expect(rechazos).toHaveLength(0);
    });
  });
});

// ───────────────────────────── Editar ─────────────────────────────
const putGet = () => ({
  pelicula: crearPelicula({ fechaLanzamiento: '1999-03-31T12:00:00' }), // mediodía: evita depender de la zona horaria del equipo
  generosSeleccionados: [generos[0]],
  generosNoSeleccionados: [generos[1], generos[2]],
  cinesSeleccionados: [cines[0]],
  cinesNoSeleccionados: [cines[1]],
  actores: [{ ...actorKeanu, personaje: 'Neo' }, { ...actorCarrie }],
});

async function abrirEditar() {
  api.onGet('/peliculas/putget/7').reply(200, putGet());
  const utils = renderConRutas(rutas, { ruta: '/peliculas/editar/7' });
  await screen.findByLabelText('Título');
  return utils;
}

describe('Editar película — integración (EditarPelicula + FormularioPelicula)', () => {
  describe('casos normales', () => {
    it('precarga título, fecha, trailer, poster, géneros, cines y actores de la película', async () => {
      const { container } = await abrirEditar();

      expect(screen.getByRole('heading', { name: 'Editar Pelicula 7' })).toBeInTheDocument();
      expect(screen.getByLabelText('Título')).toHaveValue('Matrix');
      expect(screen.getByLabelText('Fecha de Lanzamiento')).toHaveValue('1999-03-31');
      expect(screen.getByLabelText('Trailer (Youtube)')).toHaveValue('https://www.youtube.com/watch?v=vKQi3bBA1y8');
      expect(container.querySelector('img[alt="img actor"]')).toHaveAttribute('src', 'https://img/matrix.jpg');
      expect(screen.getByText('Cinépolis Centro')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Neo')).toBeInTheDocument();
      expect(screen.getByText('Carrie-Anne Moss')).toBeInTheDocument();
    });

    it('guarda los cambios con PUT multipart y navega al detalle', async () => {
      api.onPut('/peliculas/7').reply(204);
      const { usuario } = await abrirEditar();

      await usuario.clear(screen.getByLabelText('Título'));
      await usuario.type(screen.getByLabelText('Título'), 'Matrix Resurrections');
      await usuario.click(botonEnviar());

      await waitFor(() => expect(ubicacionActual()).toBe('/peliculas/7'));
      const peticion = api.history.put[0];
      expect(peticion.url).toBe('/peliculas/7');
      expect(campo(peticion, 'titulo')).toBe('Matrix Resurrections');
      expect(json(peticion, 'generosIds')).toEqual([1]);
      expect(json(peticion, 'cinesIds')).toEqual([10]);
      expect(json(peticion, 'actores')).toEqual([
        expect.objectContaining({ id: 100, personaje: 'Neo' }),
        expect.objectContaining({ id: 101, personaje: 'Trinity' }),
      ]);
    });
  });

  describe('casos límite', () => {
    it('quitar un actor con la "X" lo excluye del envío', async () => {
      api.onPut('/peliculas/7').reply(204);
      const { usuario } = await abrirEditar();

      const fila = screen.getByText('Carrie-Anne Moss').closest('li')!;
      await usuario.click(within(fila).getByRole('button', { name: 'X' }));
      await usuario.click(botonEnviar());

      await waitFor(() => expect(api.history.put).toHaveLength(1));
      expect(json(api.history.put[0], 'actores').map((a: { id: number }) => a.id)).toEqual([100]);
    });

    it('cambiar el personaje de un actor se refleja en el envío', async () => {
      api.onPut('/peliculas/7').reply(204);
      const { usuario } = await abrirEditar();

      const entrada = screen.getByDisplayValue('Neo');
      await usuario.clear(entrada);
      await usuario.type(entrada, 'Thomas Anderson');
      await usuario.click(botonEnviar());

      await waitFor(() => expect(api.history.put).toHaveLength(1));
      expect(json(api.history.put[0], 'actores')[0]).toMatchObject({ id: 100, personaje: 'Thomas Anderson' });
    });

    it('deseleccionar el único género y cine preseleccionados envía listas vacías', async () => {
      api.onPut('/peliculas/7').reply(204);
      const { usuario } = await abrirEditar();

      await usuario.click(screen.getByText('Acción'));
      await usuario.click(screen.getByText('Cinépolis Centro'));
      await usuario.click(botonEnviar());

      await waitFor(() => expect(api.history.put).toHaveLength(1));
      expect(json(api.history.put[0], 'generosIds')).toEqual([]);
      expect(json(api.history.put[0], 'cinesIds')).toEqual([]);
    });

    it('borrar el título deshabilita el envío', async () => {
      const { usuario } = await abrirEditar();
      await usuario.clear(screen.getByLabelText('Título'));
      await waitFor(() => expect(botonEnviar()).toBeDisabled());
    });
  });

  describe('escenarios de falla', () => {
    it('400 al guardar: muestra los errores y permanece en la edición', async () => {
      api.onPut('/peliculas/7').reply(400, { errors: { FechaLanzamiento: ['Fecha inválida'] } });
      const { usuario } = await abrirEditar();

      await usuario.click(botonEnviar());

      expect(await screen.findByText('FechaLanzamiento: Fecha inválida')).toBeInTheDocument();
      expect(ubicacionActual()).toBe('/peliculas/editar/7');
    });

    it('DEBERÍA manejar una película inexistente (404) sin rechazos no manejados', async () => {
      api.onGet('/peliculas/putget/7').reply(404);
      const rechazos = await capturarRechazosNoManejados(async () => {
        renderConRutas(rutas, { ruta: '/peliculas/editar/7' });
        await new Promise(r => setTimeout(r, 30));
      });
      expect(rechazos).toHaveLength(0);
    });
  });
});

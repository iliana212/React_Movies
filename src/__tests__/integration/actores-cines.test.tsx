import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import Swal from 'sweetalert2';
import IndiceActores from '../../features/actores/componentes/IndiceActores';
import CrearActor from '../../features/actores/componentes/CrearActor';
import EditarActor from '../../features/actores/componentes/EditarActor';
import IndiceCines from '../../features/cines/componentes/IndiceCines';
import CrearCine from '../../features/cines/componentes/CrearCine';
import EditarCine from '../../features/cines/componentes/EditarCine';
import { api, capturarRechazosNoManejados, renderConRutas, responderListado, ubicacionActual } from '../utils/helpers';
import { cines, fechaISO } from '../utils/fixtures';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
// El mapa real depende de Leaflet (canvas/DOM real): se sustituye por un botón que simula el clic sobre el mapa.
vi.mock('../../componentes/Mapa/Mapa', () => ({
  default: (props: { lugarSeleccionado?: (c: { lat: number; lng: number }) => void }) => (
    <button type="button" onClick={() => props.lugarSeleccionado?.({ lat: 21.12, lng: -101.68 })}>Elegir ubicación</button>
  ),
}));

const rutas = [
  { path: '/actores', element: <IndiceActores /> },
  { path: '/actores/crear', element: <CrearActor /> },
  { path: '/actores/editar/:id', element: <EditarActor /> },
  { path: '/cines', element: <IndiceCines /> },
  { path: '/cines/crear', element: <CrearCine /> },
  { path: '/cines/editar/:id', element: <EditarCine /> },
];

const actores = [
  { id: 1, nombre: 'Keanu Reeves', fechaNacimiento: '1964-09-02T12:00:00', foto: 'https://img/keanu.jpg' },
  { id: 2, nombre: 'Carrie-Anne Moss', fechaNacimiento: '1967-08-21T12:00:00', foto: 'https://img/carrie.jpg' },
];

const fila = (nombre: string) => screen.getByRole('row', { name: new RegExp(nombre) });
const botonEnviar = () => screen.getByRole('button', { name: 'Enviar' });
const campoPorId = (contenedor: HTMLElement, id: string) => contenedor.querySelector(`#${id}`) as HTMLInputElement;
const campoForm = (peticion: { data?: unknown }, nombre: string) => (peticion.data as FormData).get(nombre);

beforeEach(() => {
  vi.mocked(Swal.fire).mockReset();
  vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
});

// ───────────────────────────── Actores ─────────────────────────────
describe('Actores — integración', () => {
  describe('listado (IndiceActores)', () => {
    it('muestra foto, nombre y fecha de nacimiento con formato yyyy-mm-dd', async () => {
      responderListado('/actores', actores, 2);
      renderConRutas(rutas, { ruta: '/actores' });

      expect(await screen.findByText('Keanu Reeves')).toBeInTheDocument();
      expect(within(fila('Keanu Reeves')).getByText('1964-09-02')).toBeInTheDocument();
      expect(within(fila('Keanu Reeves')).getByAltText('foto')).toHaveAttribute('src', 'https://img/keanu.jpg');
    });

    it('sin registros muestra "No hay elementos para mostrar"', async () => {
      responderListado('/actores', [], 0);
      renderConRutas(rutas, { ruta: '/actores' });
      expect(await screen.findByText('No hay elementos para mostrar')).toBeInTheDocument();
    });

    it('"Borrar" confirmado elimina al actor y recarga la lista', async () => {
      responderListado('/actores', actores, 2);
      api.onDelete('/actores/2').reply(204);
      const { usuario } = renderConRutas(rutas, { ruta: '/actores' });
      await screen.findByText('Carrie-Anne Moss');

      await usuario.click(within(fila('Carrie-Anne Moss')).getByRole('button', { name: /Borrar/ }));

      await waitFor(() => expect(api.history.delete).toHaveLength(1));
      await waitFor(() => expect(api.history.get).toHaveLength(2));
    });

    it('"Editar" navega a /actores/editar/:id', async () => {
      responderListado('/actores', actores, 2);
      api.onGet('/actores/1').reply(200, actores[0]);
      const { usuario } = renderConRutas(rutas, { ruta: '/actores' });
      await screen.findByText('Keanu Reeves');

      await usuario.click(within(fila('Keanu Reeves')).getByRole('button', { name: /Editar/ }));

      expect(ubicacionActual()).toBe('/actores/editar/1');
    });
  });

  describe('crear (CrearActor + FormularioActor)', () => {
    it('envía multipart con nombre, fecha y foto, y vuelve al listado', async () => {
      api.onPost('/actores').reply(201);
      responderListado('/actores', actores, 2);
      const { usuario, container } = renderConRutas(rutas, { ruta: '/actores/crear' });

      await usuario.type(campoPorId(container, 'nombre'), 'Hugo Weaving');
      await usuario.type(campoPorId(container, 'fechaNacimiento'), '1960-04-04');
      await usuario.upload(container.querySelector('input[type="file"]') as HTMLInputElement, new File(['x'], 'hugo.png', { type: 'image/png' }));
      await usuario.click(botonEnviar());

      await waitFor(() => expect(ubicacionActual()).toBe('/actores'));
      // Espera a que también termine la petición del listado al que se navegó, para no dejarla en vuelo.
      await waitFor(() => expect(api.history.get.some(g => g.url === '/actores')).toBe(true));
      const peticion = api.history.post[0];
      expect(campoForm(peticion, 'nombre')).toBe('Hugo Weaving');
      expect(campoForm(peticion, 'fechaNacimiento')).toBe('1960-04-04');
      expect((campoForm(peticion, 'foto') as File).name).toBe('hugo.png');
    });

    it('inicia con Enviar deshabilitado', () => {
      renderConRutas(rutas, { ruta: '/actores/crear' });
      expect(botonEnviar()).toBeDisabled();
    });

    it('un nombre en minúscula muestra el error de primera letra', async () => {
      const { usuario, container } = renderConRutas(rutas, { ruta: '/actores/crear' });
      await usuario.type(campoPorId(container, 'nombre'), 'hugo');
      expect(await screen.findByText('La primera letra debe ser mayúscula')).toBeInTheDocument();
    });

    it('una fecha de nacimiento futura se rechaza y bloquea el envío', async () => {
      const { usuario, container } = renderConRutas(rutas, { ruta: '/actores/crear' });
      await usuario.type(campoPorId(container, 'nombre'), 'Hugo');
      await usuario.type(campoPorId(container, 'fechaNacimiento'), fechaISO(30));
      expect(await screen.findByText('La fecha no puede ser del futuro')).toBeInTheDocument();
      expect(botonEnviar()).toBeDisabled();
    });

    it('la fecha de hoy es válida (límite) y habilita el envío', async () => {
      const { usuario, container } = renderConRutas(rutas, { ruta: '/actores/crear' });
      await usuario.type(campoPorId(container, 'nombre'), 'Hugo');
      await usuario.type(campoPorId(container, 'fechaNacimiento'), fechaISO(0));
      await waitFor(() => expect(botonEnviar()).toBeEnabled());
    });

    it('la foto es opcional: sin ella el formulario se envía sin el campo "foto"', async () => {
      api.onPost('/actores').reply(201);
      responderListado('/actores', [], 0);
      const { usuario, container } = renderConRutas(rutas, { ruta: '/actores/crear' });
      await usuario.type(campoPorId(container, 'nombre'), 'Hugo');
      await usuario.type(campoPorId(container, 'fechaNacimiento'), '1960-04-04');
      await usuario.click(botonEnviar());
      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(campoForm(api.history.post[0], 'foto')).toBeNull();
    });

    it('400 del servidor: muestra los errores y permanece en el formulario', async () => {
      api.onPost('/actores').reply(400, { errors: { Foto: ['Formato no soportado'] } });
      const { usuario, container } = renderConRutas(rutas, { ruta: '/actores/crear' });
      await usuario.type(campoPorId(container, 'nombre'), 'Hugo');
      await usuario.type(campoPorId(container, 'fechaNacimiento'), '1960-04-04');
      await usuario.click(botonEnviar());
      expect(await screen.findByText('Foto: Formato no soportado')).toBeInTheDocument();
      expect(ubicacionActual()).toBe('/actores/crear');
    });

    it('DEBERÍA etiquetar el campo de fecha como fecha de nacimiento', () => {
      renderConRutas(rutas, { ruta: '/actores/crear' });
      expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
    });
  });

  describe('editar (EditarActor)', () => {
    it('precarga los datos del actor y guarda con PUT multipart', async () => {
      api.onGet('/actores/1').reply(200, actores[0]);
      api.onPut('actores/1').reply(204);
      responderListado('/actores', actores, 2);
      const { usuario, container } = renderConRutas(rutas, { ruta: '/actores/editar/1' });

      expect(screen.getByAltText('loading')).toBeInTheDocument();
      await waitFor(() => expect(campoPorId(container, 'nombre')).toHaveValue('Keanu Reeves'));
      expect(campoPorId(container, 'fechaNacimiento')).toHaveValue('1964-09-02');
      expect(container.querySelector('img[alt="img actor"]')).toHaveAttribute('src', 'https://img/keanu.jpg');

      await usuario.clear(campoPorId(container, 'nombre'));
      await usuario.type(campoPorId(container, 'nombre'), 'Keanu C. Reeves');
      await usuario.click(botonEnviar());

      await waitFor(() => expect(ubicacionActual()).toBe('/actores'));
      await waitFor(() => expect(api.history.get.filter(g => g.url === '/actores')).toHaveLength(1));
      expect(campoForm(api.history.put[0], 'nombre')).toBe('Keanu C. Reeves');
    });

    it('400 al guardar: muestra los errores y permanece en la edición', async () => {
      api.onGet('/actores/1').reply(200, actores[0]);
      api.onPut('actores/1').reply(400, { errors: { Nombre: ['Nombre duplicado'] } });
      const { usuario, container } = renderConRutas(rutas, { ruta: '/actores/editar/1' });
      await waitFor(() => expect(campoPorId(container, 'nombre')).toHaveValue('Keanu Reeves'));

      await usuario.click(botonEnviar());

      expect(await screen.findByText('Nombre: Nombre duplicado')).toBeInTheDocument();
      expect(ubicacionActual()).toBe('/actores/editar/1');
    });

    it('un actor inexistente (GET 404) redirige al listado, sin rechazos sin manejar', async () => {
      api.onGet('/actores/99').reply(404);
      responderListado('/actores', actores, 2); // IndiceActores pide esto al llegar por la redirección
      const rechazos = await capturarRechazosNoManejados(async () => {
        renderConRutas(rutas, { ruta: '/actores/editar/99' });
        await waitFor(() => expect(ubicacionActual()).toBe('/actores'));
        await waitFor(() => expect(api.history.get.some(g => g.url === '/actores')).toBe(true));
      });
      expect(rechazos).toHaveLength(0);
    });
  });
});

// ───────────────────────────── Cines ─────────────────────────────
describe('Cines — integración', () => {
  describe('listado (IndiceCines)', () => {
    it('muestra los cines y permite borrar con confirmación', async () => {
      responderListado('/cines', cines, 2);
      api.onDelete('/cines/10').reply(204);
      const { usuario } = renderConRutas(rutas, { ruta: '/cines' });
      await screen.findByText('Cinépolis Centro');
      expect(screen.getByText('Cineteca Norte')).toBeInTheDocument();

      await usuario.click(within(fila('Cinépolis Centro')).getByRole('button', { name: /Borrar/ }));

      await waitFor(() => expect(api.history.delete).toHaveLength(1));
      expect(api.history.delete[0].url).toBe('/cines/10');
      await waitFor(() => expect(api.history.get).toHaveLength(2));
    });

    it('sin cines muestra "No hay elementos para mostrar"', async () => {
      responderListado('/cines', [], 0);
      renderConRutas(rutas, { ruta: '/cines' });
      expect(await screen.findByText('No hay elementos para mostrar')).toBeInTheDocument();
    });
  });

  describe('crear (CrearCine + FormularioCine)', () => {
    it('envía nombre y coordenadas elegidas en el mapa y vuelve al listado', async () => {
      api.onPost('/cines').reply(201);
      responderListado('/cines', cines, 2);
      const { usuario } = renderConRutas(rutas, { ruta: '/cines/crear' });

      await usuario.type(screen.getByLabelText('Nombre'), 'Cinemex Plaza');
      await usuario.click(screen.getByRole('button', { name: 'Elegir ubicación' }));
      await usuario.click(botonEnviar());

      await waitFor(() => expect(ubicacionActual()).toBe('/cines'));
      await waitFor(() => expect(api.history.get.some(g => g.url === '/cines')).toBe(true));
      expect(JSON.parse(api.history.post[0].data)).toEqual({ nombre: 'Cinemex Plaza', latitud: 21.12, longitud: -101.68 });
    });

    it('sin elegir ubicación en el mapa el envío permanece deshabilitado', async () => {
      const { usuario } = renderConRutas(rutas, { ruta: '/cines/crear' });
      await usuario.type(screen.getByLabelText('Nombre'), 'Cinemex Plaza');
      expect(botonEnviar()).toBeDisabled();
    });

    it('un nombre en minúscula muestra el error y bloquea el envío aun con ubicación', async () => {
      const { usuario } = renderConRutas(rutas, { ruta: '/cines/crear' });
      await usuario.type(screen.getByLabelText('Nombre'), 'cinemex');
      await usuario.click(screen.getByRole('button', { name: 'Elegir ubicación' }));
      expect(await screen.findByText('La primera letra debe ser mayúscula')).toBeInTheDocument();
      expect(botonEnviar()).toBeDisabled();
    });

    it('400 del servidor: muestra los errores y permanece en el formulario', async () => {
      api.onPost('/cines').reply(400, { errors: { Nombre: ['El cine ya existe'] } });
      const { usuario } = renderConRutas(rutas, { ruta: '/cines/crear' });
      await usuario.type(screen.getByLabelText('Nombre'), 'Cinemex');
      await usuario.click(screen.getByRole('button', { name: 'Elegir ubicación' }));
      await usuario.click(botonEnviar());
      expect(await screen.findByText('Nombre: El cine ya existe')).toBeInTheDocument();
      expect(ubicacionActual()).toBe('/cines/crear');
    });
  });

  describe('editar (EditarCine)', () => {
    it('precarga el cine y guarda los cambios con PUT', async () => {
      api.onGet('/cines/10').reply(200, cines[0]);
      api.onPut('/cines/10').reply(204);
      responderListado('/cines', cines, 2);
      const { usuario } = renderConRutas(rutas, { ruta: '/cines/editar/10' });

      const nombre = await screen.findByLabelText('Nombre');
      expect(nombre).toHaveValue('Cinépolis Centro');
      await usuario.clear(nombre);
      await usuario.type(nombre, 'Cinépolis Norte');
      await usuario.click(botonEnviar());

      await waitFor(() => expect(ubicacionActual()).toBe('/cines'));
      await waitFor(() => expect(api.history.get.filter(g => g.url === '/cines')).toHaveLength(1));
      expect(JSON.parse(api.history.put[0].data)).toMatchObject({ nombre: 'Cinépolis Norte', latitud: 21.12, longitud: -101.68 });
    });

    it('un cine inexistente (GET 404) redirige al listado', async () => {
      api.onGet('/cines/99').reply(404);
      responderListado('/cines', cines, 2);
      renderConRutas(rutas, { ruta: '/cines/editar/99' });
      await waitFor(() => expect(ubicacionActual()).toBe('/cines'));
      await waitFor(() => expect(api.history.get.some(g => g.url === '/cines')).toBe(true));
    });

    it('400 al guardar: muestra los errores y permanece en la edición', async () => {
      api.onGet('/cines/10').reply(200, cines[0]);
      api.onPut('/cines/10').reply(400, { errors: { Latitud: ['Fuera de rango'] } });
      const { usuario } = renderConRutas(rutas, { ruta: '/cines/editar/10' });
      await screen.findByLabelText('Nombre');

      await usuario.click(botonEnviar());

      expect(await screen.findByText('Latitud: Fuera de rango')).toBeInTheDocument();
      expect(ubicacionActual()).toBe('/cines/editar/10');
    });
  });
});

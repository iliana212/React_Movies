import { Component, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import Swal from 'sweetalert2';
import FiltrarPeliculas from '../../features/peliculas/componentes/FiltrarPeliculas';
import DetallePelicula from '../../features/peliculas/componentes/DetallePelicula';
import PeliculaIndividual from '../../features/peliculas/componentes/PeliculaIndividual';
import LandingPage from '../../features/home/componentes/LandingPage';
import { api, capturarRechazosNoManejados, iniciarSesion, renderConRutas, ubicacionActual } from '../utils/helpers';
import { actorCarrie, actorKeanu, claimsAdmin, claimsUsuarioComun, cines, crearPelicula, generos } from '../utils/fixtures';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
vi.mock('react-leaflet', async () => {
  const React = await import('react');
  const contenedor = (testid: string) => (p: { children?: React.ReactNode }) => React.createElement('div', { 'data-testid': testid }, p.children);
  return { MapContainer: contenedor('mapa'), Marker: contenedor('marcador'), Popup: contenedor('popup'), TileLayer: () => null, useMapEvent: vi.fn() };
});

beforeEach(() => {
  vi.mocked(Swal.fire).mockReset();
  vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
});

// ───────────────────────────── Filtro de películas ─────────────────────────────
const matrix = crearPelicula({ id: 1, titulo: 'Matrix' });
const reloaded = crearPelicula({ id: 2, titulo: 'Matrix Reloaded' });
const selectorGenero = () => screen.getByRole('option', { name: '--Seleccione un género' }).closest('select')!;
const busquedas = () => api.history.get.filter(g => g.url === '/peliculas/filtrar');
const ultimaBusqueda = () => busquedas().at(-1)!.params;

function montarFiltro(opciones: { ruta?: string; lista?: unknown[]; total?: number; listaGeneros?: unknown[] } = {}) {
  const { ruta = '/peliculas/filtrar', lista = [matrix, reloaded], total = 2, listaGeneros = generos } = opciones;
  api.onGet('/generos/todos').reply(200, listaGeneros);
  api.onGet('/peliculas/filtrar').reply(200, lista, { 'cantidad-total-registros': String(total) });
  return renderConRutas([{ path: '/peliculas/filtrar', element: <FiltrarPeliculas /> }], { ruta });
}

describe('Filtrar películas — integración (FiltrarPeliculas + useFiltroPeliculas)', () => {
  describe('casos normales', () => {
    it('al abrir carga los géneros, busca con los valores por defecto y sincroniza la URL', async () => {
      montarFiltro();

      expect(await screen.findByRole('link', { name: 'Matrix' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Matrix Reloaded' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Drama' })).toBeInTheDocument();
      expect(ultimaBusqueda()).toEqual({ titulo: '', generoId: 0, proximosEstrenos: false, enCines: false, pagina: 1, recordsPorPagina: 2 });
      await waitFor(() => expect(ubicacionActual()).toBe('/peliculas/filtrar?pagina=1&recordsPorPagina=2'));
    });

    it('filtra por título y lo refleja en la URL', async () => {
      const { usuario } = montarFiltro();
      await screen.findByRole('link', { name: 'Matrix' });

      await usuario.type(screen.getByPlaceholderText('Título Película'), 'Reloaded');
      await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));

      await waitFor(() => expect(busquedas()).toHaveLength(2));
      expect(ultimaBusqueda()).toMatchObject({ titulo: 'Reloaded' });
      expect(ubicacionActual()).toContain('titulo=Reloaded');
    });

    it('filtra por género', async () => {
      const { usuario } = montarFiltro();
      await screen.findByRole('link', { name: 'Matrix' });

      await usuario.selectOptions(selectorGenero(), 'Drama');
      await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));

      await waitFor(() => expect(busquedas()).toHaveLength(2));
      expect(String(ultimaBusqueda().generoId)).toBe('2');
      expect(ubicacionActual()).toContain('generoId=2');
    });

    it('filtra por "En Cines" y "Próximos Estrenos"', async () => {
      const { usuario } = montarFiltro();
      await screen.findByRole('link', { name: 'Matrix' });

      await usuario.click(screen.getByLabelText('En Cines'));
      await usuario.click(screen.getByLabelText('Próximos Estrenos'));
      await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));

      await waitFor(() => expect(busquedas()).toHaveLength(2));
      expect(ultimaBusqueda()).toMatchObject({ enCines: true, proximosEstrenos: true });
      expect(ubicacionActual()).toContain('enCines=true');
      expect(ubicacionActual()).toContain('proximosEstrenos=true');
    });

    it('"Limpiar" restablece el formulario y vuelve a buscar sin filtros', async () => {
      const { usuario } = montarFiltro();
      await screen.findByRole('link', { name: 'Matrix' });
      await usuario.type(screen.getByPlaceholderText('Título Película'), 'Reloaded');
      await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));
      await waitFor(() => expect(busquedas()).toHaveLength(2));

      await usuario.click(screen.getByRole('button', { name: 'Limpiar' }));

      await waitFor(() => expect(busquedas()).toHaveLength(3));
      expect(screen.getByPlaceholderText('Título Película')).toHaveValue('');
      expect(ultimaBusqueda()).toMatchObject({ titulo: '', generoId: 0, enCines: false, proximosEstrenos: false });
      expect(ubicacionActual()).not.toContain('titulo=');
    });

    it('cambiar de página busca la nueva página y actualiza la URL', async () => {
      const { usuario } = montarFiltro({ total: 5 });
      await screen.findByRole('link', { name: 'Matrix' });

      await usuario.click(screen.getByRole('button', { name: '2' }));

      await waitFor(() => expect(busquedas()).toHaveLength(2));
      expect(ultimaBusqueda()).toMatchObject({ pagina: 2, recordsPorPagina: 2 });
      expect(ubicacionActual()).toContain('pagina=2');
    });
  });

  describe('casos límite', () => {
    it('sin resultados muestra "No hay peliculas para mostrar"', async () => {
      montarFiltro({ lista: [], total: 0 });
      await waitFor(() => expect(busquedas()).toHaveLength(1));
      expect(screen.getByText('No hay peliculas para mostrar')).toBeInTheDocument();
      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });

    it('restaura filtros y paginación desde los parámetros de la URL', async () => {
      montarFiltro({ ruta: '/peliculas/filtrar?titulo=Matrix&generoId=2&pagina=2&recordsPorPagina=10', total: 25 });

      await waitFor(() => expect(busquedas().length).toBeGreaterThan(0));
      expect(ultimaBusqueda()).toMatchObject({ titulo: 'Matrix', generoId: 2, pagina: 2, recordsPorPagina: 10 });
      expect(screen.getByPlaceholderText('Título Película')).toHaveValue('Matrix');
      await waitFor(() => expect(selectorGenero()).toHaveValue('2'));
    });

    it('restaura las casillas marcadas desde la URL (?enCines=true&proximosEstrenos=true)', async () => {
      montarFiltro({ ruta: '/peliculas/filtrar?enCines=true&proximosEstrenos=true' });
      await waitFor(() => expect(screen.getByLabelText('En Cines')).toBeChecked());
      expect(screen.getByLabelText('Próximos Estrenos')).toBeChecked();
    });
  });

  describe('escenarios de falla / hallazgos', () => {
    it('si la búsqueda falla (500) registra el error y muestra el listado vacío sin romper', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.onGet('/generos/todos').reply(200, generos);
      api.onGet('/peliculas/filtrar').reply(500);
      renderConRutas([{ path: '/peliculas/filtrar', element: <FiltrarPeliculas /> }], { ruta: '/peliculas/filtrar' });

      expect(await screen.findByText('No hay peliculas para mostrar')).toBeInTheDocument();
      await waitFor(() => expect(consola).toHaveBeenCalled());
    });

    // HALLAZGO: Boolean("false") === true, por eso ?enCines=false en la URL marca la casilla.
    it('DEBERÍA interpretar ?enCines=false como casilla desmarcada', async () => {
      montarFiltro({ ruta: '/peliculas/filtrar?enCines=false' });
      await waitFor(() => expect(busquedas().length).toBeGreaterThan(0));
      expect(screen.getByLabelText('En Cines')).not.toBeChecked();
    });

    // HALLAZGO: el efecto inicial sale si generos.length === 0; si aún no hay géneros registrados la pantalla nunca lista películas.
    it('DEBERÍA buscar películas aunque no existan géneros registrados', async () => {
      montarFiltro({ listaGeneros: [] });
      await new Promise(r => setTimeout(r, 60));
      expect(busquedas().length).toBeGreaterThan(0);
    });

    it('DEBERÍA manejar el fallo de /generos/todos sin rechazos no manejados', async () => {
      api.onGet('/generos/todos').networkError();
      const rechazos = await capturarRechazosNoManejados(async () => {
        renderConRutas([{ path: '/peliculas/filtrar', element: <FiltrarPeliculas /> }], { ruta: '/peliculas/filtrar' });
        await new Promise(r => setTimeout(r, 30));
      });
      expect(rechazos).toHaveLength(0);
    });
  });
});

// ───────────────────────────── Inicio y tarjeta de película ─────────────────────────────
const dune = crearPelicula({ id: 3, titulo: 'Dune' });

describe('Inicio y tarjeta de película — integración (LandingPage + PeliculaIndividual)', () => {
  const rutasInicio = [
    { path: '/', element: <LandingPage /> },
    { path: '/peliculas/editar/:id', element: <p>PANTALLA EDITAR</p> },
    { path: '/peliculas/:id', element: <p>PANTALLA DETALLE</p> },
  ];

  describe('casos normales', () => {
    it('muestra las películas de cada sección', async () => {
      api.onGet('/peliculas/landing').reply(200, { enCines: [matrix], proximosEstrenos: [dune] });
      renderConRutas(rutasInicio);
      expect(await screen.findByRole('link', { name: 'Matrix' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Dune' })).toBeInTheDocument();
    });

    it('el título enlaza al detalle de la película', async () => {
      api.onGet('/peliculas/landing').reply(200, { enCines: [matrix], proximosEstrenos: [] });
      const { usuario } = renderConRutas(rutasInicio);
      await usuario.click(await screen.findByRole('link', { name: 'Matrix' }));
      expect(ubicacionActual()).toBe('/peliculas/1');
    });

    it('un administrador ve Editar y Borrar; un usuario común no', async () => {
      api.onGet('/peliculas/landing').reply(200, { enCines: [matrix], proximosEstrenos: [] });
      const { unmount } = renderConRutas(rutasInicio, { claims: claimsAdmin });
      expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Borrar' })).toBeInTheDocument();
      unmount();

      renderConRutas(rutasInicio, { claims: claimsUsuarioComun });
      await screen.findByRole('link', { name: 'Matrix' });
      expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument();
    });

    it('"Editar" desde el inicio abre /peliculas/editar/:id', async () => {
      api.onGet('/peliculas/landing').reply(200, { enCines: [matrix], proximosEstrenos: [] });
      const { usuario } = renderConRutas(rutasInicio, { claims: claimsAdmin });
      await usuario.click(await screen.findByRole('button', { name: 'Editar' }));
      expect(ubicacionActual()).toBe('/peliculas/editar/1');
    });

    it('"Borrar" confirmado elimina la película y recarga el inicio', async () => {
      api.onGet('/peliculas/landing').reply(200, { enCines: [matrix], proximosEstrenos: [] });
      api.onDelete('/peliculas/1').reply(204);
      const { usuario } = renderConRutas(rutasInicio, { claims: claimsAdmin });

      await usuario.click(await screen.findByRole('button', { name: 'Borrar' }));

      await waitFor(() => expect(api.history.delete).toHaveLength(1));
      await waitFor(() => expect(api.history.get.filter(g => g.url === '/peliculas/landing')).toHaveLength(2));
    });
  });

  describe('casos límite', () => {
    it('sin películas en ninguna sección muestra el mensaje de vacío dos veces', async () => {
      api.onGet('/peliculas/landing').reply(200, { enCines: [], proximosEstrenos: [] });
      renderConRutas(rutasInicio);
      await waitFor(() => expect(api.history.get).toHaveLength(1));
      await waitFor(() => expect(document.body.textContent!.match(/No hay peliculas para mostrar/g)).toHaveLength(2));
    });

    it('la respuesta sin secciones (objeto vacío) queda en estado "cargando" sin fallar', async () => {
      api.onGet('/peliculas/landing').reply(200, {});
      renderConRutas(rutasInicio);
      await waitFor(() => expect(api.history.get).toHaveLength(1));
      expect(screen.getAllByAltText('loading')).toHaveLength(2);
    });

    it('"Borrar" cancelado no elimina nada', async () => {
      vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: false } as never);
      api.onGet('/peliculas/landing').reply(200, { enCines: [matrix], proximosEstrenos: [] });
      const { usuario } = renderConRutas(rutasInicio, { claims: claimsAdmin });

      await usuario.click(await screen.findByRole('button', { name: 'Borrar' }));

      await waitFor(() => expect(Swal.fire).toHaveBeenCalled());
      expect(api.history.delete).toHaveLength(0);
    });
  });

  describe('escenarios de falla / hallazgos', () => {
    it('si el DELETE falla (500) registra el error y no recarga', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.onGet('/peliculas/landing').reply(200, { enCines: [matrix], proximosEstrenos: [] });
      api.onDelete('/peliculas/1').reply(500);
      const { usuario } = renderConRutas(rutasInicio, { claims: claimsAdmin });

      await usuario.click(await screen.findByRole('button', { name: 'Borrar' }));

      await waitFor(() => expect(consola).toHaveBeenCalled());
      expect(api.history.get.filter(g => g.url === '/peliculas/landing')).toHaveLength(1);
    });

    it('DEBERÍA abrir /peliculas/editar/:id también cuando la tarjeta está en /peliculas/filtrar', async () => {
      const { usuario } = renderConRutas(
        [{ path: '/peliculas/filtrar', element: <PeliculaIndividual pelicula={matrix} /> }, { path: '/peliculas/editar/:id', element: <p>PANTALLA EDITAR</p> }],
        { ruta: '/peliculas/filtrar', claims: claimsAdmin },
      );
      await usuario.click(await screen.findByRole('button', { name: 'Editar' }));
      expect(ubicacionActual()).toBe('/peliculas/editar/1');
    });
  });
});

// ───────────────────────────── Detalle de película ─────────────────────────────
class Limite extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  render() { return this.state.fallo ? <p>PANTALLA ROTA</p> : this.props.children; }
}

const montarDetalle = (pelicula = crearPelicula()) => {
  api.onGet('/peliculas/7').reply(200, pelicula);
  return renderConRutas([{ path: '/peliculas/:id', element: <DetallePelicula /> }], { ruta: '/peliculas/7' });
};
const estrellas = (contenedor: HTMLElement) => Array.from(contenedor.querySelectorAll('i.bi-star-fill'));
/** Rating dibuja las estrellas en un efecto: hay que esperarlas antes de interactuar. */
const esperarEstrellas = async (contenedor: HTMLElement) => {
  await waitFor(() => expect(estrellas(contenedor)).toHaveLength(5));
  return estrellas(contenedor);
};

describe('Detalle de película — integración (DetallePelicula + Rating + Mapa)', () => {
  describe('casos normales', () => {
    it('muestra título con año, géneros, puntuación, actores y poster', async () => {
      const { container } = montarDetalle(crearPelicula({ generos: [generos[0], generos[1]], actores: [actorKeanu, actorCarrie] }));

      expect(await screen.findByRole('heading', { level: 1, name: /Matrix\s*\(1999\)/ })).toBeInTheDocument();
      expect(screen.getByText('Acción')).toBeInTheDocument();
      expect(screen.getByText('Drama')).toBeInTheDocument();
      expect(screen.getByText(/Puntuación: 4.5/)).toBeInTheDocument();
      expect(screen.getByAltText('Keanu Reeves')).toHaveAttribute('src', actorKeanu.foto);
      expect(screen.getByText('Trinity')).toBeInTheDocument();
      expect(container.querySelector('img[src="https://img/matrix.jpg"]')).toBeInTheDocument();
    });

    it('convierte la URL de YouTube (?v=) en la URL embebida del trailer', async () => {
      montarDetalle();
      expect(await screen.findByTitle('Trailer')).toHaveAttribute('src', 'https://www.youtube.com/embed/vKQi3bBA1y8');
    });

    it('dibuja el mapa con un marcador por cine y su nombre en el popup', async () => {
      montarDetalle(crearPelicula({ cines }));
      expect(await screen.findByTestId('mapa')).toBeInTheDocument();
      expect(screen.getAllByTestId('marcador')).toHaveLength(2);
      expect(screen.getByText('Cinépolis Centro')).toBeInTheDocument();
    });

    it('con sesión iniciada, votar envía { peliculaId, puntuacion } y confirma con un aviso', async () => {
      iniciarSesion();
      api.onPost('/rating').reply(200);
      const { container, usuario } = montarDetalle();
      const votos = await esperarEstrellas(container);

      await usuario.click(votos[3]);

      await waitFor(() => expect(api.history.post).toHaveLength(1));
      expect(JSON.parse(api.history.post[0].data)).toEqual({ peliculaId: 7, puntuacion: 4 });
      await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith({ icon: 'success', title: 'Voto recibido!' }));
    });

    it('marca las estrellas del voto previo del usuario', async () => {
      const { container } = montarDetalle(crearPelicula({ votoUsuario: 3 }));
      const votos = await esperarEstrellas(container);
      expect(votos.filter(e => e.classList.contains('checked'))).toHaveLength(3);
    });
  });

  describe('casos límite', () => {
    it('sin géneros, actores ni cines no dibuja esas secciones', async () => {
      montarDetalle(crearPelicula({ generos: [], actores: [], cines: [] }));
      await screen.findByTitle('Trailer');
      expect(screen.queryByText('Actores')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mapa')).not.toBeInTheDocument();
      expect(document.querySelector('.badge')).not.toBeInTheDocument();
    });

    it('con propiedades opcionales ausentes (undefined) tampoco falla', async () => {
      montarDetalle(crearPelicula({ generos: undefined, actores: undefined, cines: undefined }));
      expect(await screen.findByTitle('Trailer')).toBeInTheDocument();
    });

    // Límite documentado: solo se reconoce el formato ?v=; los enlaces cortos youtu.be dejan el iframe sin src.
    it('un enlace corto youtu.be no genera URL embebida', async () => {
      montarDetalle(crearPelicula({ trailer: 'https://youtu.be/vKQi3bBA1y8' }));
      expect(await screen.findByTitle('Trailer')).not.toHaveAttribute('src');
    });

    it('mientras carga muestra el indicador de "cargando"', () => {
      api.onGet('/peliculas/7').reply(() => new Promise(() => {})); // nunca responde
      renderConRutas([{ path: '/peliculas/:id', element: <DetallePelicula /> }], { ruta: '/peliculas/7' });
      expect(screen.getByAltText('loading')).toBeInTheDocument();
    });
  });

  describe('escenarios de falla / hallazgos', () => {
    it('sin sesión, votar muestra "Debes loguearte para votar" y no envía el voto', async () => {
      const { container, usuario } = montarDetalle();
      const votos = await esperarEstrellas(container);

      await usuario.click(votos[2]);

      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error', text: 'Debes loguearte para votar' }));
      expect(api.history.post).toHaveLength(0);
    });

    it('DEBERÍA avisar al usuario y no dejar rechazos sin manejar cuando el voto falla (500)', async () => {
      iniciarSesion();
      api.onPost('/rating').reply(500);
      const { container, usuario } = montarDetalle();
      const votos = await esperarEstrellas(container);

      const rechazos = await capturarRechazosNoManejados(() => usuario.click(votos[3]));

      expect(api.history.post).toHaveLength(1); // el voto sí se intentó enviar
      expect(rechazos).toHaveLength(0);
    });

    it('DEBERÍA manejar una película inexistente (404) sin rechazos no manejados', async () => {
      api.onGet('/peliculas/7').reply(404);
      const rechazos = await capturarRechazosNoManejados(async () => {
        renderConRutas([{ path: '/peliculas/:id', element: <DetallePelicula /> }], { ruta: '/peliculas/7' });
        await new Promise(r => setTimeout(r, 30));
      });
      expect(rechazos).toHaveLength(0);
    });

    it('DEBERÍA mostrar el detalle aunque el trailer no sea una URL válida', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      api.onGet('/peliculas/7').reply(200, crearPelicula({ trailer: '' }));
      renderConRutas([{ path: '/peliculas/:id', element: <Limite><DetallePelicula /></Limite> }], { ruta: '/peliculas/7' });

      await waitFor(() => expect(within(document.body).queryByText('PANTALLA ROTA')).not.toBeInTheDocument());
      expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });
});

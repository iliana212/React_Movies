import type Genero from '../../features/generos/modelos/Genero.model';
import type Cine from '../../features/cines/modelos/Cine.model';
import type Pelicula from '../../features/peliculas/modelos/Pelicula.model';
import type ActorPelicula from '../../features/peliculas/modelos/ActorPelicula';
import type Claim from '../../features/seguridad/modelos/Claim';

export const generos: Genero[] = [
  { id: 1, nombre: 'Acción' },
  { id: 2, nombre: 'Drama' },
  { id: 3, nombre: 'Comedia' },
];

export const cines: Cine[] = [
  { id: 10, nombre: 'Cinépolis Centro', latitud: 21.12, longitud: -101.68 },
  { id: 11, nombre: 'Cineteca Norte', latitud: 21.15, longitud: -101.7 },
];

export const actorKeanu: ActorPelicula = { id: 100, nombre: 'Keanu Reeves', personaje: '', foto: 'https://img/keanu.jpg' };
export const actorCarrie: ActorPelicula = { id: 101, nombre: 'Carrie-Anne Moss', personaje: 'Trinity', foto: 'https://img/carrie.jpg' };

export function crearPelicula(cambios: Partial<Pelicula> = {}): Pelicula {
  return {
    id: 7,
    titulo: 'Matrix',
    poster: 'https://img/matrix.jpg',
    fechaLanzamiento: '1999-03-31T00:00:00',
    trailer: 'https://www.youtube.com/watch?v=vKQi3bBA1y8',
    generos: [generos[0]],
    cines: [cines[0]],
    actores: [actorKeanu],
    votoUsuario: 0,
    promedioVoto: 4.5,
    ...cambios,
  };
}

export const claimAdmin: Claim = { nombre: 'esadmin', valor: '1' };
export const claimEmail: Claim = { nombre: 'email', valor: 'admin@correo.com' };
export const claimsAdmin: Claim[] = [claimEmail, claimAdmin];
export const claimsUsuarioComun: Claim[] = [{ nombre: 'email', valor: 'user@correo.com' }];

/** Devuelve una fecha en formato yyyy-mm-dd desplazada `dias` respecto a hoy (UTC). */
export function fechaISO(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().split('T')[0];
}

import type Pelicula from "../modelos/Pelicula.model";
import PeliculaIndividual from "./PeliculaIndividual";
import styles from './ListadoPeliculas.module.css';
import ListadoGenerico from "../../../componentes/ListadoGenerico";

export default function ListadoPeliculas(props: ListadoPeliculasProps){
    return (
        <ListadoGenerico<Pelicula> listado={props.peliculas} listadoVacioUI={<>No hay peliculas para mostrar</>}>
            <div className={styles.div}>
                {props.peliculas?.map(pelicula => <PeliculaIndividual key={pelicula.id} pelicula={pelicula} />)}
            </div>
        </ListadoGenerico>
   
    )
   
    
}

interface ListadoPeliculasProps{
    peliculas?: Pelicula[];

}
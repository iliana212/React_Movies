import { useEffect, useState } from "react";
import { useParams } from "react-router";
import type Pelicula from "../modelos/Pelicula.model";
import clienteAPI from "../../../api/clienteAxios";
import Cargando from "../../../componentes/Cargando";
import type Coordenada from "../../../componentes/Mapa/Coordenada.model";
import Mapa from "../../../componentes/Mapa/Mapa";
import Rating from "../../../componentes/Rating/Rating";
import type RatingCreacion from "../../../componentes/Rating/RatingCreacion.model";
import Swal from "sweetalert2";

export default function DetallePelicula(){
    const {id} = useParams();
    const [pelicula, setPelicula] = useState<Pelicula>();

    useEffect(()=>{
        clienteAPI.get<Pelicula>(`/peliculas/${id}`).then(res => setPelicula(res.data));
    }, [id]);

    if(!pelicula){
        return <Cargando />
    }

    const fecha =new Date(pelicula.fechaLanzamiento);
    const año = fecha.getFullYear();
    const fechaFormateada = fecha.toLocaleDateString();

    function ObtenerUrlEmbebida(url: string): string | undefined {
        const objURL = new URL(url);
        const videoId = objURL.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : undefined;
    }

    function transformarCoordenadas(): Coordenada[]{
        return pelicula!.cines!.map(c => {
            const coordenada: Coordenada = {lat: c.latitud, lng: c.longitud, mensaje: c.nombre};
            return coordenada
        })
    }

    function manejarVoto(voto:number){
        const data: RatingCreacion = {peliculaId: Number(id), puntuacion: voto};
        clienteAPI.post('/rating', data).then(()=> Swal.fire({icon:'success', title: 'Voto recibido!'}));
    }

    return(
        <>
            <div className="container my-4">
                <div className="mb-3">
                    <h1>{pelicula.titulo} <small className="text-muted">({año})</small></h1>
                    
                    {pelicula.generos && pelicula.generos.length > 0 && (
                        <div className="mb-2">
                            {pelicula.generos.map(genero => 
                                <span key={genero.id} className="badge bg-primary me-2">{genero.nombre}</span>)}
                        </div>
                    )}

                    <p className="text-muted">Estreno: {fechaFormateada} <br />
                        Puntuación: {pelicula.promedioVoto} | Mi rating: <Rating maximoValor={5} valorSeleccionado={pelicula.votoUsuario} onChange={voto=>manejarVoto(voto)} /></p>
                </div>
                <div className="d-flex">
                    <span className="d-inline-block me-2">
                        <h4>Poster</h4>
                        <img src={pelicula.poster} style={{width:'225px', height:'315px'}} />
                    </span>
                    {pelicula.trailer.length > 0}(
                    <span>
                        <h4>Trailer</h4>
                        <iframe width="565" height="315" src={ObtenerUrlEmbebida(pelicula.trailer)} title="Trailer" allowFullScreen></iframe>
                    </span> 
                    )                                       
                </div>
                {pelicula.actores && pelicula.actores.length > 0 && (
                    <div>
                        <h4>Actores</h4>
                        <div className="row">
                            {pelicula.actores.map(actor => (
                                <div key={actor.id} className="col-md-4 d-flex mb-3">
                                    <img src={actor.foto} alt={actor.nombre} style={{width:'80px', height:'100px'}} />
                                    <div>
                                        <strong>{actor.nombre}</strong>
                                        <br/>
                                        <span className="text-muted">{actor.personaje}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {pelicula.cines && pelicula.cines.length > 0 && (
                    <div className="w-100">
                        <h4>Mostrándose en los siguientes cines:</h4>
                        <Mapa coordenadas={transformarCoordenadas()} editable={false} />
                    </div>
                )}

            </div>
        </>
    )
}
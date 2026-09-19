import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type PeliculaCreacion from "../modelos/PeliculaCreacion.model";
import FormularioPelicula from "./FormularioPelicula";
import Cargando from "../../../componentes/Cargando";
import type { SubmitHandler } from "react-hook-form";
import type PeliculasPutGet from "../modelos/PeliculasPutGet";
import clienteAPI from "../../../api/clienteAxios";
import formatearFecha from "../../../utilidades/formatearFecha";
import ConvertirPeliculaAFormData from "../utilidades/convertirAFormData";
import { extraerErrores } from "../../../utilidades/extraerErrores";
import type { AxiosError } from "axios";


export default function EditarPelicula(){
    const {id} = useParams();
    const [modelo, setModelo] = useState<PeliculaCreacion | undefined>(undefined);
    const [peliculaPutGet, setPeliculaPutGet] = useState<PeliculasPutGet>();
    const [errores, setErrores] = useState<string[]>([]);
    const navigate = useNavigate();


    useEffect(()=>{
        clienteAPI.get<PeliculasPutGet>(`/peliculas/putget/${id}`).then(res => {
            const pelicula = res.data.pelicula;
            const peliculaCreacion: PeliculaCreacion = {
                titulo: pelicula.titulo,
                fechaLanzamiento: formatearFecha(pelicula.fechaLanzamiento),
                poster: pelicula.poster,
                trailer: pelicula.trailer
            }
            setModelo(peliculaCreacion);
            setPeliculaPutGet(res.data);
        })
    },[id])

    const onSubmit: SubmitHandler<PeliculaCreacion> = async (data) => {
        try{
            const formData = ConvertirPeliculaAFormData(data);
            await clienteAPI.putForm(`/peliculas/${id}`,formData);
            navigate(`/peliculas/${id}`);
        }catch(err){
            const errores = extraerErrores(err as AxiosError);
            setErrores(errores);
        }
    }

    return (
        <>
            <h3>Editar Pelicula {id}</h3>
            {modelo && peliculaPutGet ? <FormularioPelicula modelo={modelo} onSubmit={onSubmit} errores={errores}
            generosSeleccionados={peliculaPutGet.generosSeleccionados} generosNoSeleccionados={peliculaPutGet.generosNoSeleccionados}
            cinesSeleccionados={peliculaPutGet.cinesSeleccionados} cinesNoSeleccionados={peliculaPutGet.cinesNoSeleccionados}
            actoresSeleccionados={peliculaPutGet.actores} /> : <Cargando />} 
        </>       
    )
}
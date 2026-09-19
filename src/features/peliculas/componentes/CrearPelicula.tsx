import type { SubmitHandler } from "react-hook-form"
import type PeliculaCreacion from "../modelos/PeliculaCreacion.model"
import FormularioPelicula from "./FormularioPelicula";
import type Genero from "../../generos/modelos/Genero.model";
import type Cine from "../../cines/modelos/Cine.model";
import { useEffect, useState } from "react";
import clienteAPI from "../../../api/clienteAxios";
import type PeliculasPostGet from "../modelos/PeliculasPostGet";
import Cargando from "../../../componentes/Cargando";
import ConvertirPeliculaAFormData from "../utilidades/convertirAFormData";
import { useNavigate } from "react-router";
import { extraerErrores } from "../../../utilidades/extraerErrores";
import type { AxiosError } from "axios";
import type Pelicula from "../modelos/Pelicula.model";

export default function CrearPelicula(){
    const [generosNoSeleccionados, setGenerosNoSeleccionados] = useState<Genero[]>([]);
    const [cinesNoSeleccionados, setCinesNoSeleccionados] = useState<Cine[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errores, setErrores] = useState<string[]>([]);
    const navigate = useNavigate();

    useEffect(()=>{
        clienteAPI.get<PeliculasPostGet>('/peliculas/postget').then(res => {
            setGenerosNoSeleccionados(res.data.generos);
            setCinesNoSeleccionados(res.data.cines);
            setCargando(false);
        });
    },[]);

    const onSubmit: SubmitHandler<PeliculaCreacion> = async (data) =>{
        try{
            const formData = ConvertirPeliculaAFormData(data);
            const respuesta = await clienteAPI.postForm<Pelicula>('/peliculas', formData);
            navigate(`/peliculas/${respuesta.data.id}`);
        }catch(err){
            const errores = extraerErrores(err as AxiosError);
            setErrores(errores);
        }
    }

   
    return (
        <>
            <h3>Crear Pelicula</h3>
            {cargando ? <Cargando /> : 
                <FormularioPelicula onSubmit={onSubmit} errores={errores}
                generosSeleccionados={[]} generosNoSeleccionados={generosNoSeleccionados} 
                cinesSeleccionados={[]} cinesNoSeleccionados={cinesNoSeleccionados} 
                actoresSeleccionados={[]} />           
            }            
        </>        
    )
}
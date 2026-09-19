import { useForm, type SubmitHandler } from "react-hook-form";
import type CineCreacion from "../modelos/CineCreacion.model";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { primeraLetraMayus } from "../../../validaciones/Validaciones";
import Boton from "../../../componentes/Boton";
import { NavLink } from "react-router";
import Mapa from "../../../componentes/Mapa/Mapa";
import type Coordenada from "../../../componentes/Mapa/Coordenada.model";
import MostrarErrores from "../../../componentes/MostrarErrores";
export default function CineCreacion(props: CineCreacionProps){

    const {register,handleSubmit,setValue,formState:{errors,isValid,isSubmitting}} = useForm<CineCreacion>({
        resolver: yupResolver(reglasValidacion),
        mode: 'onChange',
        defaultValues: props.modelo ?? {nombre: ''}
    });

    function transformarCoordenadas() : Coordenada[] | undefined {
        if(props.modelo){
            const respuesta: Coordenada = {
                lat: props.modelo.latitud,
                lng: props.modelo.longitud
            }
            return [respuesta];
        }
        return undefined;
    }

    return (
        <>
            <MostrarErrores errores={props.errores} />
            <form onSubmit={handleSubmit(props.onSubmit)}>
                <div className="form-group">
                    <label htmlFor="nombre">Nombre</label>
                    <input type='text' id='nombre' className="form-control" {...register('nombre')} />
                    {errors.nombre && <p className="error">{errors.nombre.message}</p>}
                </div>
                <div className="mt-4">
                    <Mapa coordenadas={transformarCoordenadas()} editable={true} lugarSeleccionado={coordenada => {
                        setValue('latitud', coordenada.lat, {shouldValidate: true});
                        setValue('longitud', coordenada.lng, {shouldValidate: true});
                    } } />
                </div>
                <div className="mt-2">
                    <Boton type='submit' disabled={!isValid || isSubmitting}>{isSubmitting ? 'Enviando...' : 'Enviar'}</Boton>
                    <NavLink to='/cines' className='btn btn-secondary ms-2'>Cancelar</NavLink>
                </div>
            </form>
        </>
    )

}

interface CineCreacionProps{
    modelo?: CineCreacion;
    onSubmit: SubmitHandler<CineCreacion>;
    errores: string[];
}

const reglasValidacion = yup.object({
    nombre: yup.string().required('El nombre es obligatorio').test(primeraLetraMayus()),
    latitud: yup.number().required(),
    longitud: yup.number().required()
})
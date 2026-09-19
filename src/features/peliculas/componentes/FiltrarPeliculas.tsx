import { useForm, type SubmitHandler } from "react-hook-form";
import Boton from "../../../componentes/Boton";
import ListadoPeliculas from "./ListadoPeliculas";
import Paginacion from "../../../componentes/Paginacion";
import type FormType from "../modelos/PeliculasFiltrar.moldel";
import useFiltroPeliculas from "../hooks/useFiltroPeliculas";

export default function FiltrarPeliculas(){
    
    const valorInicial: FormType={
        titulo: '',
        generoId: 0,
        proximosEstrenos: false,
        enCines: false
    }
    
    const {register, handleSubmit, reset, setValue, formState: {isSubmitting}} = useForm<FormType>({
        defaultValues: valorInicial
    });
        
    const onSubmit: SubmitHandler<FormType> = async (data) => {
        await buscarPeliculas(data);
    }

    const {buscarPeliculas,generos,pagina,recordsPorPagina,cantidadTotalRegistros,setPagina,setRecordsPorPagina,peliculas} = useFiltroPeliculas(valorInicial,setValue);
 
    return(
        <>
            <h3>Filtro de peliculas</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="row row-cols-lg-auto g-3 align-items-center">
                <div className="col-12">
                    <input id="titulo" placeholder="Título Película" className="form-control" {...register('titulo')} />
                </div>
                <div className="col-12">
                    <select className="form-select" {...register('generoId')}>
                        <option value='0'>--Seleccione un género</option>
                        {generos.map(genero => <option key={genero.id} value={genero.id}>{genero.nombre}</option>)}
                    </select>
                </div>
                <div className="col-12">
                    <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="proximosEstrenos" {...register('proximosEstrenos')} />
                        <label htmlFor="proximosEstrenos">Próximos Estrenos</label>
                    </div>
                </div>
                <div className="col-12">
                    <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="enCines" {...register('enCines')} />
                        <label htmlFor="enCines">En Cines</label>
                    </div>
                </div>
                <div className="col-12">
                    <Boton disabled={isSubmitting} type="submit">{isSubmitting ? 'Filtrando...' : 'Filtrar'}</Boton>
                    <Boton onClick={() => {reset(); buscarPeliculas(valorInicial);}} className="btn btn-danger ms-2">Limpiar</Boton>
                </div>
            </form>

            <div className="mt-4">
                <Paginacion 
                    paginaActual={pagina} registrosPorPagina={recordsPorPagina}
                    cantidadTotalRegistros={cantidadTotalRegistros}
                    registrosPorPaginasOpciones={[2,10,30]}
                    onCambioPaginacion={(pagina, recordsPorPagina) => {
                        setPagina(pagina);
                        setRecordsPorPagina(recordsPorPagina);
                    }}
                />
            </div>

            <div className="mt-4">
                <ListadoPeliculas peliculas={peliculas} />
            </div>
        </>
    )
}


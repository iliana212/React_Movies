import IndiceEntidades from "../../../componentes/IndiceEntidades";
import { useEntidades } from "../../../hooks/useEntidades";
import formatearFecha from "../../../utilidades/formatearFecha";
import type Actor from "../modelos/Actor.model";

export default function IndiceActores() {
    const entidadesHook = useEntidades<Actor>('/actores');

    return (
        <IndiceEntidades<Actor> titulo='Actores' nombreEntidad="Actor" url="/actores" urlCrear="/actores/crear" {...entidadesHook}>
            {(actores, botones) =>
                <>
                    <thead>
                        <tr>
                            <th scope="col">Nombre</th>
                            <th scope="col">Fecha Nacimiento</th>
                            <th scope="col" className="text-end">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {actores?.map(actor => <tr key={actor.id}>
                            <td>
                                <img className="me-2" width={35} alt="foto" src={actor.foto}></img>
                                {actor.nombre}
                            </td>
                            <td>{formatearFecha(actor.fechaNacimiento)}</td>
                            <td className="text-end">
                                {botones(`/actores/editar/${actor.id}`, actor.id)}
                            </td>
                        </tr>)}
                    </tbody>
                </>
            }
        </IndiceEntidades>
    )
}
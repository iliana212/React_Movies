import Swal from "sweetalert2";
import clienteAPI from "../../../api/clienteAxios";
import IndiceEntidades from "../../../componentes/IndiceEntidades";
import { useEntidades } from "../../../hooks/useEntidades";
import type EditarClaim from "../modelos/EditarClaim.model";
import type Usuario from "../modelos/Usuario.model";
import Boton from "../../../componentes/Boton";
import Confirmar from "../../../utilidades/Confirmar";

export default function IndiceUsuarios(){
    const usuariosHook = useEntidades<Usuario>('/usuarios/listadoUsuarios');

    async function hacerAdmin(email: string){
        await editarAdmin('usuarios/hacerAdmin', email);
    }

     async function removerAdmin(email: string){
        await editarAdmin('usuarios/removerAdmin', email);
    }

    async function editarAdmin(url: string, email: string){
        const editarClaim: EditarClaim = {email};
        await clienteAPI.post(url, editarClaim);
        Swal.fire({title: 'Exitoso', text: 'Operación realizada con éxito', icon: 'success'});
    }

    return(
        <IndiceEntidades titulo="Usuarios" {...usuariosHook}>
            {(usuarios) => <>
                <thead className="table-dark">
                    <tr>
                        <th scope="col">Email</th>
                        <th scope="col" className="text-end">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map(usuario => <tr key={usuario.email}>
                        <td>{usuario.email}</td>
                        <td className="text-end">
                            <Boton onClick={()=> Confirmar(() => hacerAdmin(usuario.email), `Deseas hacer admin a: ${usuario.email}`, 'Si')}>Hacer Admin</Boton>
                            <Boton className="btn btn-danger ms-1" onClick={()=> Confirmar(() => removerAdmin(usuario.email),`Deseas remover admin: ${usuario.email}`, 'Si')}>Remover Admin</Boton>       
                        </td>

                    </tr>)}
                </tbody>
            </>}
        </IndiceEntidades>
    )
}
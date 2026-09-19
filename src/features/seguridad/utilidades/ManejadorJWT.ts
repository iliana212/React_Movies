import type RespuestaAutenticacion from "../modelos/RespuestaAutenticacion";
import type Claim from "../modelos/Claim";

const llaveToken = "token";
const llaveExpiracion = "token-expiracion";

export function usuarioLogueado(){
    const claims = obtenerClaims();
    return claims.length > 0;
}

export function guardarTokenLocalStorage(autenticacion: RespuestaAutenticacion){
    localStorage.setItem(llaveToken, autenticacion.token);
    localStorage.setItem(llaveExpiracion, autenticacion.expiracion.toString());
}

export function Logout(){
    localStorage.removeItem(llaveToken);
    localStorage.removeItem(llaveExpiracion);
}

export function obtenerClaims(): Claim[]{
    const token = localStorage.getItem(llaveToken);
    const expiracion = localStorage.getItem(llaveExpiracion);

    if(!token || !expiracion){
        return [];
    }

    const expiracionFecha = new Date(expiracion);
    if(isNaN(expiracionFecha.getTime()) || expiracionFecha <= new Date()){
        Logout();
        return [];
    }

    try{
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const dataToken = JSON.parse(payloadJson);

        const claims : Claim[] = Object.entries(dataToken).map(([nombre, valor]) => ({nombre, valor: String(valor)}));
        return claims;

    }catch(err){
        console.error(err);
        Logout();
        return [];
    }
}

export function obtenerToken(){
    return localStorage.getItem(llaveToken);
}
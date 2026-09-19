import type { AxiosError } from "axios";

export function extraerErrores(obj: AxiosError): string[]{
    const data = obj.response?.data as RespuestaError;

    const err = data.errors;
    let mensajesDeError: string[] = [];

    for (const campo in err){
        const mensajes = err[campo].map(mensajeError => `${campo}: ${mensajeError}`);
        mensajesDeError = mensajesDeError.concat(mensajes);
    }

    return mensajesDeError;
}


interface RespuestaError{
    errors: {
        [campo: string]: string[];
    }
}
import type { AxiosError } from "axios";

export function extraerErrores(obj: AxiosError): string[]{
    const data = obj.response?.data as RespuestaError;
    let mensajesDeError: string[] = [];

    const err = data?.errors ?? [];
    if (!err) return mensajesDeError;

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
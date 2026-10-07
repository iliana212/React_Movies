import type { AxiosError } from "axios";

export default function ExtraerErroresIdentity(obj: AxiosError): string[]{
    const data = obj.response?.data as RespuestaError[];
    let mensajesDeError: string[] = [];
    if (!data) return mensajesDeError;

    mensajesDeError = data.map(error => error.description);
    return mensajesDeError;
}

interface RespuestaError{
    code: string;
    description: string;
}
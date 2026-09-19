import type { AxiosError } from "axios";

export default function ExtraerErroresIdentity(obj: AxiosError): string[]{
    const data = obj.response?.data as RespuestaError[];
    const mensajeError : string[] = data.map(error => error.description);
    return mensajeError;
}

interface RespuestaError{
    code: string;
    description: string;
}
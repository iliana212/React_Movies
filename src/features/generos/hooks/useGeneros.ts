import { useState, useEffect, useCallback } from "react";
import clienteAPI from "../../../api/clienteAxios";
import type Genero from "../modelos/Genero.model";

export function useGeneros() {
    const [generos, setGeneros] = useState<Genero[]>();
    const [cantidadTotalRegistros, setCantidadTotalRegistros] = useState(0);
    const [pagina, setPagina] = useState(1);
    const [recordsPorPagina, setRecordsPorPagina] = useState(3);
    const [cargando, setCargando] = useState(true);

    const cargarRegistros = useCallback(() => {
        setCargando(true);
        clienteAPI.get<Genero[]>('/generos', { params: { pagina, recordsPorPagina } }).then(resp => {
            const cantidadTotalRegistros = parseInt(resp.headers["cantidad-total-registros"]);
            setCantidadTotalRegistros(cantidadTotalRegistros);
            setGeneros(resp.data);
            setCargando(false);
        });
    }, [pagina, recordsPorPagina]);

    useEffect(() => {
        cargarRegistros();
    }, [cargarRegistros]);
    // axios.get('https://localhost:44353/api/generos').then(res => console.log(res.data))

    return { generos, cantidadTotalRegistros, cargando, pagina, recordsPorPagina, setPagina, setRecordsPorPagina, cargarRegistros }
}
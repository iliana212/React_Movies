import { useState, useEffect } from "react";
import ListadoPeliculas from "../../peliculas/componentes/ListadoPeliculas";
import type Pelicula from "../../peliculas/modelos/Pelicula.model";
import clienteAPI from "../../../api/clienteAxios";
import AlertaContext from "../../../utilidades/AlertaContext";

export default function LandingPage() {
    const [peliculas, setPeliculas] = useState<AppState>({});

    useEffect(() => {
        cargarDatos();
    }, [])

    function cargarDatos() {
        clienteAPI.get<AppState>('/peliculas/landing').then(res => setPeliculas(res.data));
    }

    return (
        <>
            <AlertaContext.Provider value={() => cargarDatos()}>
                <h3>En Cines</h3>
                <ListadoPeliculas peliculas={peliculas.enCines} />

                <h3>Próximos Estrenos</h3>
                <ListadoPeliculas peliculas={peliculas.proximosEstrenos} />
            </AlertaContext.Provider>
        </>
    )
}

interface AppState {
    enCines?: Pelicula[];
    proximosEstrenos?: Pelicula[];
}
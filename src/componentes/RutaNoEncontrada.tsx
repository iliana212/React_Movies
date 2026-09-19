import { useEffect } from "react";
import { Navigate } from "react-router";
import { useLocation } from "react-router"

export default function RutaNoEncontrada(){
    const location = useLocation();
    useEffect(() => {
        console.log(`Ruta no encontrada: ${location.pathname} `)
    }, [location]);

    return <Navigate to='/' />
}
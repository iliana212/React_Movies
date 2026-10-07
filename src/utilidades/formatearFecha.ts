export default function formatearFecha(fechaISO: string){
     const tieneZonaExplicita = /Z$|[+-]\d{2}:\d{2}$/.test(fechaISO);

    if (tieneZonaExplicita) {
        return new Date(fechaISO).toISOString().split('T')[0];
    }

    if (Number.isNaN(new Date(fechaISO).getTime())) {
        throw new RangeError('Invalid time value');
    }

    return fechaISO.split('T')[0];
}
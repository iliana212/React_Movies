export function primeraLetraMayus(){
    return{
        name: 'primera-letra-mayus',
        message: 'La primera letra debe ser mayúscula',
        test: (valor: string | undefined) => {
            if(valor && valor.length > 0){
                const primeraLetra = valor.substring(0,1);
                return primeraLetra === primeraLetra.toUpperCase();
            }
            return true;
        }
    }
}

export function fechaNoFutura(){
    return{
        name: 'fecha-no-es-futura',
        message: 'La fecha no puede ser del futuro',
        test: (valor: string | undefined) => {
            if (!valor) return true;

            const fecha = new Date(valor);
            const hoy = new Date();
            return fecha <= hoy;
        }
    }
}
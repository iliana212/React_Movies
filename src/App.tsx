import { BrowserRouter } from 'react-router';
import './App.css'
import Menu from './componentes/Menu';
import AppRoutes from './AppRoutes';
import { useEffect, useState } from 'react';
import type Claim from './features/seguridad/modelos/Claim';
import AutenticacionContext from './features/seguridad/utilidades/AutenticacionContex';
import { obtenerClaims } from './features/seguridad/utilidades/ManejadorJWT';

function App() {
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(()=>{
    setClaims(obtenerClaims());
  }, []);

  function actualizar(claims: Claim[]){
    setClaims(claims);
  }

  return (
    <>
      <BrowserRouter>
        <AutenticacionContext.Provider value={{claims,actualizar}}>
          <Menu />
          <div className='container'>
            <AppRoutes />
          </div>
        </AutenticacionContext.Provider>
      </BrowserRouter>
    </>
  )
}



export default App

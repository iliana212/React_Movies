import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Autorizado from '../../features/seguridad/componentes/Autorizado';
import AutenticacionContext from '../../features/seguridad/utilidades/AutenticacionContex';
import type Claim from '../../features/seguridad/modelos/Claim';
import { claimsAdmin, claimsUsuarioComun } from '../utils/fixtures';

const alContexto = (claims: Claim[], hijo: React.ReactElement) => (
  <AutenticacionContext.Provider value={{ claims, actualizar: () => {} }}>{hijo}</AutenticacionContext.Provider>
);

const contenido = <p>CONTENIDO</p>;
const rechazo = <p>RECHAZADO</p>;

describe('Autorizado', () => {
  describe('sin claims requeridos (basta con estar autenticado)', () => {
    it('muestra el contenido cuando el usuario tiene al menos un claim', () => {
      render(alContexto(claimsUsuarioComun, <Autorizado autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('CONTENIDO')).toBeInTheDocument();
      expect(screen.queryByText('RECHAZADO')).not.toBeInTheDocument();
    });

    it('muestra "noAutorizado" cuando no hay sesión (claims vacíos)', () => {
      render(alContexto([], <Autorizado autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('RECHAZADO')).toBeInTheDocument();
      expect(screen.queryByText('CONTENIDO')).not.toBeInTheDocument();
    });
  });

  describe('con claims requeridos', () => {
    it('autoriza cuando el usuario posee el claim requerido', () => {
      render(alContexto(claimsAdmin, <Autorizado claims={['esadmin']} autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('CONTENIDO')).toBeInTheDocument();
    });

    it('rechaza a un usuario autenticado que no posee el claim', () => {
      render(alContexto(claimsUsuarioComun, <Autorizado claims={['esadmin']} autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('RECHAZADO')).toBeInTheDocument();
      expect(screen.queryByText('CONTENIDO')).not.toBeInTheDocument();
    });

    it('con varios claims requeridos basta con poseer uno (OR)', () => {
      render(alContexto(claimsAdmin, <Autorizado claims={['gerente', 'esadmin']} autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('CONTENIDO')).toBeInTheDocument();
    });

    it('el nombre del claim distingue mayúsculas de minúsculas', () => {
      render(alContexto(claimsAdmin, <Autorizado claims={['EsAdmin']} autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('RECHAZADO')).toBeInTheDocument();
    });

    it('un arreglo de claims vacío rechaza incluso a un usuario autenticado (límite)', () => {
      render(alContexto(claimsAdmin, <Autorizado claims={[]} autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('RECHAZADO')).toBeInTheDocument();
    });
  });

  describe('escenarios de falla y reactividad', () => {
    it('sin "noAutorizado" un usuario rechazado no ve nada', () => {
      const { container } = render(alContexto([], <Autorizado claims={['esadmin']} autorizado={contenido} />));
      expect(container).toBeEmptyDOMElement();
    });

    it('reacciona a cambios del contexto: iniciar y cerrar sesión', () => {
      const { rerender } = render(alContexto([], <Autorizado autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('RECHAZADO')).toBeInTheDocument();

      rerender(alContexto(claimsAdmin, <Autorizado autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('CONTENIDO')).toBeInTheDocument();

      rerender(alContexto([], <Autorizado autorizado={contenido} noAutorizado={rechazo} />));
      expect(screen.getByText('RECHAZADO')).toBeInTheDocument();
    });
  });
});

🇪🇸 [Español](README.md)&nbsp;|&nbsp;🇬🇧 English

# 🎬 Movies — React Client

Single-page application (SPA) built with **React 19**, **TypeScript** and **Vite** that consumes the [Movies API](https://github.com/iliana212/API_Movies) (ASP.NET Core / .NET 10). It lets users browse and filter movies, rate them, and — with the right role — manage genres, actors, cinemas and movies.

There is also an Angular version of this client: [Angular_Movies](https://github.com/iliana212/Angular_Movies).

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white) ![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)

*Folder and file names (`features/peliculas`, `cines`, `generos`, `seguridad`…) are kept as-is from the actual codebase — they are Spanish for movies, cinemas, genres and security.*

> **Status:** actively in development.

![Inicio](docs/home.png) ![Filtro](docs/filtro.png) ![Detalle](docs/detalle.png) ![Actores](docs/actores.png)

## At a glance

- **Landing page** with movies in theaters and upcoming releases
- **Movie filter** by title, genre, in theaters and upcoming releases, with pagination
- **Movie details** with ratings from authenticated users
- **JWT authentication**: sign up and sign in, token expiry handling, and an Axios interceptor that attaches the token to every request
- **Claim-protected routes** (`esadmin`) for managing genres, actors, cinemas and movies
- Full CRUD with validated forms, **image uploads**, actor autocomplete, and an **interactive map** to locate cinemas
- Reusable generic components (lists, pagination, multi-select, error handling)

## Tech stack

| Area | Technology |
| --- | --- |
| UI | React 19, TypeScript 5.8 |
| Build tool | Vite 6 (SWC) |
| Routing | React Router 7 |
| Forms | React Hook Form, Yup |
| HTTP | Axios (with JWT interceptor) |
| Maps | Leaflet, React-Leaflet |
| Autocomplete | react-bootstrap-typeahead |
| Styling | Bootstrap 5, Bootstrap Icons |
| Alerts | SweetAlert2 |
| Quality | ESLint 9 |

## Project structure

```
src/
├── api/            # Axios client (baseURL + JWT interceptor)
├── componentes/    # Shared components (Map, Rating, Pagination, MultiSelect…)
├── features/       # Domain modules
│   ├── actores/
│   ├── cines/
│   ├── generos/
│   ├── peliculas/
│   ├── seguridad/  # Login, sign up, protected routes, JWT handling
│   └── home/
├── hooks/          # Reusable hooks (useEntidades)
├── utilidades/     # Alerts, confirmations, error handling, dates
└── validaciones/   # Yup validations
```

## Getting started

### Prerequisites

- A current [Node.js](https://nodejs.org/) LTS release (20.19+ or 22.12+)
- The [Movies API](https://github.com/iliana212/API_Movies) running locally (follow its README)

### Installation

```bash
git clone https://github.com/iliana212/React_Movies.git
cd React_Movies
npm install
```

### Configure the API URL

Create a `.env` file in the project root with the API base URL (including `/api`):

```bash
VITE_API_URL=https://localhost:7263/api
```

> The API only accepts requests from allowed origins. Make sure `http://localhost:5173` (Vite's default port) is listed in the API's `origenesPermitidos` setting.

### Run in development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check with TypeScript and create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Related projects

| Project | Description |
| --- | --- |
| [API_Movies](https://github.com/iliana212/API_Movies) | ASP.NET Core Web API (backend) |
| [Angular_Movies](https://github.com/iliana212/Angular_Movies) | Angular client |

## Author

**Iliana Barron** — [@iliana212](https://github.com/iliana212)

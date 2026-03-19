import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Home from '../pages/Home';
import Weapons from '../pages/Weapons';
import Vehicles from '../pages/Vehicles';
import Characters from '../pages/Characters';
import Races from '../pages/Races';
import Planets from '../pages/Planets';
import Games from '../pages/Games';
import Factions from '../pages/Factions';
import About from '../pages/About';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'weapons', element: <Weapons /> },
      { path: 'vehicles', element: <Vehicles /> },
      { path: 'characters', element: <Characters /> },
      { path: 'races', element: <Races /> },
      { path: 'planets', element: <Planets /> },
      { path: 'games', element: <Games /> },
      { path: 'factions', element: <Factions /> },
      { path: 'about', element: <About /> },
    ],
  },
]);

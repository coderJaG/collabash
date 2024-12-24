import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import Navigation from "./components/Navigation";
import LandingPage from "./components/LandingPage";
import GetAllPotsPage from "./components/GetAllPotsPage";
import CreatePotsPage from "./components/CreatePotsPage";
import PotsLayout from "./components/PotsLayout";
import PotDetailsPage from "./components/PotDetailspage";


import * as sessionActions from './store/session'

function Layout() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    dispatch(sessionActions.restoreUser()).then(() => {
      setIsLoaded(true);
    });
  }, [dispatch])

  return (
    <>
      <Navigation isLoaded={isLoaded} />
      {isLoaded && <Outlet />}
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <LandingPage />
      },
      {
        path: '/pots',
        element: <PotsLayout />,
        children: [
          {
            index: true,
            element: <GetAllPotsPage />
          },
          {
            path: 'create',
            element: <CreatePotsPage />
          }
        ]
      },
      {
        path: '/pots/:potId',
        element: <PotDetailsPage />
      }
    ]
  }
])

function App() {
  return <RouterProvider router={router} />;
}

export default App;

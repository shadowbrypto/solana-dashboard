import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles/globals.css";
import App from "./App";
import { Layout } from "./layouts/Layout";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import DailyReport from "./pages/DailyReport";
import WeeklyInsights from "./pages/WeeklyInsights";
import ProtocolAdmin from "./pages/ProtocolAdmin";

// Set dark mode as default
document.documentElement.classList.add("dark");

// Create a router with our routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <App />,
      },
      {
        path: "overview",
        children: [
          {
            path: "weekly-insights",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <WeeklyInsights />
              </React.Suspense>
            ),
          },
        ],
      },
      {
        path: "reports",
        children: [
          {
            path: "daily",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <DailyReport />
              </React.Suspense>
            ),
          },
        ],
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "admin",
        children: [
          {
            path: "protocols",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <ProtocolAdmin />
              </React.Suspense>
            ),
          },
        ],
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


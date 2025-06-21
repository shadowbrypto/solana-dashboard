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
import { ThemeProvider } from "./lib/theme";
import { useLocation } from "react-router-dom";

// Wrapper component to handle protocol changes efficiently
function AppWrapper() {
  const location = useLocation();
  // Only force remount when protocol changes, not on all search param changes
  const searchParams = new URLSearchParams(location.search);
  const protocol = searchParams.get('protocol') || 'trojan';
  return <App key={protocol} />;
}

// Create a router with our routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <AppWrapper />,
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
    <ThemeProvider defaultTheme="dark">
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);


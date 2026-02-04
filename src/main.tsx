import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles/globals.css";
import App from "./App";
import { Layout } from "./layouts/Layout";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import DailyReport from "./pages/DailyReport";
import MonthlyReport from "./pages/MonthlyReport";
import WeeklyReport from "./pages/WeeklyReport";
import WeeklyInsights from "./pages/WeeklyInsights";
import ProtocolAdmin from "./pages/ProtocolAdmin";
import TradingAppsComparison from "./pages/TradingAppsComparison";
import AllLaunchpads from "./pages/AllLaunchpads";
import { LaunchpadPage } from "./pages/LaunchpadPage";
import CustomReports from "./pages/CustomReports";
import ProtocolComparison from "./pages/ProtocolComparison";
import TraderStats from "./pages/TraderStats";
import FeeComparison from "./pages/FeeComparison";
import UserMilestones from "./pages/UserMilestones";
import { HomePage } from "./pages/HomePage";
import { ThemeProvider } from "./lib/theme";
import { useLocation } from "react-router-dom";

// Simple wrapper - exactly like it was originally
function AppWrapper() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const protocol = searchParams.get('protocol') || 'trojanonsolana';
  return <App key={protocol} />;
}

// Back to the ORIGINAL working router structure
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
        path: "home",
        element: <HomePage />,
      },
      {
        path: "overview",
        children: [
          {
            path: "comparison",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <TradingAppsComparison />
              </React.Suspense>
            ),
          },
          {
            path: "all-launchpads",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <AllLaunchpads />
              </React.Suspense>
            ),
          },
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
          {
            path: "weekly",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <WeeklyReport />
              </React.Suspense>
            ),
          },
          {
            path: "monthly",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <MonthlyReport />
              </React.Suspense>
            ),
          },
          {
            path: "custom",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <CustomReports />
              </React.Suspense>
            ),
          },
          {
            path: "trader-stats",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <TraderStats />
              </React.Suspense>
            ),
          },
          {
            path: "fee-comparison",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <FeeComparison />
              </React.Suspense>
            ),
          },
          {
            path: "user-milestones",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <UserMilestones />
              </React.Suspense>
            ),
          },
          {
            path: "protocol-comparison",
            element: (
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    Loading...
                  </div>
                }
              >
                <ProtocolComparison />
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
        path: "launchpad",
        element: (
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                Loading...
              </div>
            }
          >
            <LaunchpadPage />
          </React.Suspense>
        ),
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
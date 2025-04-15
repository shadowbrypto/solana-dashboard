import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles/globals.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { Layout } from "./layouts/Layout";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import DailyReport from "./pages/DailyReport";
import MonthlyReport from "./pages/MonthlyReport";

// import jsonData from "../public/data/protocolData.json";
import { queryProtocolData } from "./loaders/protocol";

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
        loader: async ({ request }) => {
          const searchParams = new URL(request.url).searchParams;
          const protocol = searchParams.get("protocol") || "";
          return { data: await queryProtocolData(protocol) };
        },
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
            loader: async () => {
              return {};
            },
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
        ],
      },
      {
        path: "about",
        element: <About />,
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

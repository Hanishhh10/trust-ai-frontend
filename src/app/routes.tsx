import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { InterviewRoom } from "./pages/InterviewRoom";
import { JoinInterview } from "./pages/JoinInterview";
import { CreateInterview } from "./pages/CreateInterview";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/create",
    Component: CreateInterview,
  },
  {
    path: "/join",
    Component: JoinInterview,
  },
  {
    path: "/interview/:sessionId",
    Component: InterviewRoom,
  },
]);

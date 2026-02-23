import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useUnreadCount } from "../../hooks/useUnreadCount";

export default function AppLayout() {
  useUnreadCount();

  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}

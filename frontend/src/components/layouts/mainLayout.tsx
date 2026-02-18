import { Outlet } from "react-router-dom";

export default function MainLayout() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-grey-100 to-grey-300 dark:from-gray-900 dark:to-gray-800">
            <Outlet />
        </div>
    );
}

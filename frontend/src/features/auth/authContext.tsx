import { createContext, useState, useEffect } from "react";
import { api } from "@/services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const login = async (email: string, password: string) => {
        const { data } = await api.post("/auth/login", { email, password });
        setUser(data.user);
    };

    const logout = async () => {
        await api.post("/auth/logout");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

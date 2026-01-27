import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import api from "./client";

export const login = async (email: string, password: string, expoPushToken: string | null) => {
    const response = await api.post("/login", { email, password });
    await AsyncStorage.setItem("token", response.data.token);
    await AsyncStorage.setItem("user", JSON.stringify(response.data.user));

    if (expoPushToken) {
        await api.post('/push-token', { token: expoPushToken });
    }

    return response.data.user;
};

export const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  
    router.replace("/login");
};

export const getUser = async () => {
    const user = await AsyncStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

export const isLoggedIn = async () => !!await AsyncStorage.getItem("token");
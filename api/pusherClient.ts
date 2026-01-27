import AsyncStorage from "@react-native-async-storage/async-storage";
import Pusher from "pusher-js/react-native";
import { Config } from "../config";

let pusher: Pusher | null = null;

export const initPusher = async (userId: number, onMessage: (data: any) => void) => {
    if (pusher) return; // already initialized

    const token = await AsyncStorage.getItem("token");

    pusher = new Pusher(Config.PUSHER_APP_KEY!, {
        cluster: "eu",
        authEndpoint: `${Config.API_BASE_URL}/broadcasting/auth`,
        forceTLS: true,
        auth: {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        },
    });

    const channel = pusher.subscribe(`private-${Config.APP_ENV}.user.${userId}`);

    channel.bind("notification.created", (data: any) => {
        onMessage(data);
    });

    channel.bind("message.created", (data: any) => {
        onMessage(data);
    });

    channel.bind("chat.created", (data: any) => {
        onMessage(data);
    });

};

import { isLoggedIn, login } from '@/api/auth';
import { useNotificationRouting } from '@/utils/useNotificationRouting';
import { usePushNotifications } from '@/utils/usePushNotifications';
import { router } from "expo-router";
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Send push token to backend if available
  const { expoPushToken } = usePushNotifications();
      
  useNotificationRouting();

  const handleSubmit = async () => {
    try {
      setError('');
      setLoading(true);
      await login(email, password, expoPushToken);
      // user is now logged in
      // app-level auth state should update here
    } catch (err: any) {
      if (err.response) {
        // Server responded_attach
        setError(err.response.data?.message || 'Serverfehler');
      } else if (err.request) {
        console.log(err)
        // Request sent, no response
        setError('Keine Verbindung zum Server');
      } else {
        // Something else
        setError(err.message || 'Unbekannter Fehler');
      }
    } finally {
        if (await isLoggedIn()) {
            setLoading(false);
            router.replace({ pathname: "/(tabs)" });
        }
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Zimaboard</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Passwort"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
          />

          <TouchableOpacity
            onPress={() => setShowPassword(prev => !prev)}
            style={styles.iconButton}
          >
            <FontAwesome5
              name={showPassword ? 'eye-slash' : 'eye'}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={({ pressed }) => [
            styles.button,
            pressed && !loading && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <Text style={styles.buttonText}>Anmelden</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f4f6', // gray-100
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    color: '#dc2626', // red-600
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db', // gray-300
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb', // blue-600
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    backgroundColor: '#1d4ed8', // blue-700
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  iconButton: {
    position: 'absolute',
    right: 12,
    top: '35%',
    transform: [{ translateY: -10 }], // Center vertically
    padding: 4,
  },

  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
});

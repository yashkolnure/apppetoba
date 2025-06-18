// screens/LoginScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const HEADER_FLEX = 0.4;
const SYSTEM_FONT = Platform.select({ ios: 'System', android: 'Roboto' });

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const toggleShowPassword = () => {
    Animated.timing(rotation, {
      toValue: showPassword ? 0 : 1,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    setShowPassword(prev => !prev);
  };

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Both fields are required.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('https://menubackend-git-main-yashkolnures-projects.vercel.app/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Login failed');

      const token = data.token ?? data.data?.token;
      const restaurant = data.restaurant ?? data.data?.restaurant;
      if (!token) throw new Error('No token returned');

      await AsyncStorage.setItem('token', token);
      if (restaurant) {
        await AsyncStorage.setItem('restaurant', JSON.stringify(restaurant));
      }
      navigation.replace('Home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <LinearGradient
      colors={['#F97316', '#9300AD']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      {/* Header with Brand Logo */}
      <View style={[styles.header, { flex: HEADER_FLEX }]}>  
        <Image
          source={{ uri: 'https://website.avenirya.com/wp-content/uploads/2025/04/Untitled_design__2_-removebg-preview.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
       
      </View>

      {/* Login Card */}
      <Animated.View style={[styles.card, { flex: 1 - HEADER_FLEX, opacity: fadeAnim }]}>  
        <KeyboardAvoidingView
          style={styles.form}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Text style={styles.loginTitle}>Login</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Email Input Box */}
          <View style={[
            styles.inputWrapper,
            focused === 'email' && styles.inputWrapperFocused
          ]}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </View>

          {/* Password Input Box */}
          <View style={[
            styles.inputWrapper,
            focused === 'password' && styles.inputWrapperFocused
          ]}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
            />
            <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeBtn}>
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#777" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FF8C00" /> : <Text style={styles.buttonText}>Login</Text>}
            </TouchableOpacity>
          </Animated.View>

          {/* Powered By Footer */}
          <Text style={styles.poweredBy}>Powered by Avenirya Solutions (OPC) Pvt. Ltd.</Text>
        </KeyboardAvoidingView>
      </Animated.View>
    </LinearGradient>
  );
}

const CARD_RADIUS = 40;
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 24 },
  logo: { width: 350, height: 200, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderTopLeftRadius: CARD_RADIUS, borderTopRightRadius: CARD_RADIUS, paddingTop: 32, paddingHorizontal: 24 },
  form: { flex: 1 },
  loginTitle: { fontSize: 26, fontWeight: '500', color: '#333', marginBottom: 16, fontFamily: SYSTEM_FONT },
  error: { color: '#D64545', fontSize: 13, marginBottom: 12, fontFamily: SYSTEM_FONT, textAlign: 'center' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  inputWrapperFocused: { borderColor: '#F97316' },
  input: { flex: 1, height: 50, fontSize: 16, color: '#333', fontFamily: SYSTEM_FONT },
  eyeBtn: { padding: 4, marginLeft: 8 },
  button: { marginTop: 24, backgroundColor: '#F97316', borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', width: width * 0.6, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 3 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '500', fontFamily: SYSTEM_FONT },
  poweredBy: { marginTop: 52, fontSize: 12, color: '#777', textAlign: 'center', fontFamily: SYSTEM_FONT },
});

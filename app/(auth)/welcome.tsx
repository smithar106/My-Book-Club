import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function WelcomeScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setError(null);
    setLoading(true);
    const { error: e } = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (e) setError(e.message);
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>My Book Club</Text>
      <Text style={s.sub}>Find your people. Read together.</Text>

      <TextInput
        style={s.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={s.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleAuth} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Loading…' : mode === 'signup' ? 'Get Started' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
        <Text style={s.toggle}>
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Sign up'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  btn: { backgroundColor: '#2D6A4F', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle: { textAlign: 'center', marginTop: 16, color: '#2D6A4F' },
  error: { color: 'red', marginBottom: 8 },
});

import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../../src/lib/supabase';

const VALUE_PROPS = [
  { icon: '🎯', text: 'Automatically matched with 5–7 readers who read exactly like you' },
  { icon: '📖', text: 'A book chosen for your group's shared taste — no debates, just reading' },
  { icon: '💬', text: 'Guided discussion prompts unlocked as you read — no group chat chaos' },
];

export default function WelcomeScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: e } = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (e) setError(e.message);
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.hero}>
        <Text style={s.heroIcon}>📚</Text>
        <Text style={s.title}>My Book Club</Text>
        <Text style={s.heroTagline}>
          The book club that finds your people,{'\n'}picks your book, and makes it easy.
        </Text>
      </View>

      <View style={s.props}>
        {VALUE_PROPS.map((p, i) => (
          <View key={i} style={s.propRow}>
            <Text style={s.propIcon}>{p.icon}</Text>
            <Text style={s.propText}>{p.text}</Text>
          </View>
        ))}
      </View>

      <View style={s.form}>
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#A89B8C"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor="#A89B8C"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleAuth} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Loading…' : mode === 'signup' ? 'Find My Book Club →' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          <Text style={s.toggle}>
            {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Sign up'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FEFAF4' },
  container: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 32 },
  heroIcon: { fontSize: 52, marginBottom: 12 },
  title: { fontSize: 34, fontWeight: '800', color: '#1C1C1E', textAlign: 'center', marginBottom: 10 },
  heroTagline: { fontSize: 17, color: '#4A3728', textAlign: 'center', lineHeight: 26, fontWeight: '500' },
  props: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 28, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  propRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  propIcon: { fontSize: 22, width: 30 },
  propText: { flex: 1, fontSize: 15, color: '#2C2C2E', lineHeight: 22 },
  form: { gap: 0 },
  input: { borderWidth: 1.5, borderColor: '#E5D9CC', borderRadius: 14, padding: 16, marginBottom: 12,
    fontSize: 16, backgroundColor: '#fff', color: '#1C1C1E' },
  btn: { backgroundColor: '#2D6A4F', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  toggle: { textAlign: 'center', marginTop: 18, color: '#2D6A4F', fontSize: 15 },
  error: { color: '#C0392B', marginBottom: 8, fontSize: 14 },
});

import React, { useState } from 'react'
import { Alert, StyleSheet, View, Button, TextInput, ActivityIndicator, Text } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { signIn } from '../store/authSlice'
import { RootState } from '../store'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const dispatch = useDispatch()
  const { loading, error } = useSelector((state: RootState) => state.auth)

  const handleSignIn = async () => {
    try {
      await dispatch(signIn({ email, password })).unwrap()
      // Navigation auto via _layout.tsx
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur de connexion')
    }
  }

  async function signUpWithEmail() {
    // L'inscription reste en local pour l'instant
    try {
      const { data: { session }, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      })
      if (error) Alert.alert(error.message)
      if (!session) Alert.alert('Please check your inbox for email verification!')
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur d\'inscription')
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TextInput
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      <View style={styles.verticallySpaced}>
        <TextInput
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          placeholder="Password"
          autoCapitalize="none"
        />
      </View>
      {error ? (
        <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text>
      ) : null}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button title="Sign in" disabled={loading} onPress={handleSignIn} />
        {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
      </View>
      <View style={styles.verticallySpaced}>
        <Button title="Sign up" disabled={loading} onPress={() => signUpWithEmail()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
})

/**
 * Onboarding — choix des disciplines / sous-disciplines suivies.
 *
 * Affiché par `(app)/_layout` après l'inscription (ou pour tout compte sans
 * abonnement) avant d'arriver sur le feed. Sauvegarde via
 * `userMirror.updateMyProfile({ subscriptions })` (grades inchangés).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProfile } from '../store/profileSlice';
import { convex, api } from '../lib/convex';
import { onboardingSkippedKey } from '../lib/onboarding';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../assets/design-system';


type Discipline = { id: number; name: string; sub_disciplines: { id: number; name: string }[] };

export default function OnboardingScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { disciplines } = useAppSelector((s) => s.profile) as { disciplines: Discipline[] };

  // Clés : `d:<id>` (discipline sans sous-discipline) ou `s:<id>` (sous-discipline).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Arrivée directe (deep link / reload) : le profil n'est pas encore chargé.
  useEffect(() => {
    if (user?.id && disciplines.length === 0) dispatch(fetchProfile(user.id));
  }, [user?.id, disciplines.length, dispatch]);

  const keysFor = (d: Discipline) =>
    d.sub_disciplines.length > 0 ? d.sub_disciplines.map((s) => `s:${s.id}`) : [`d:${d.id}`];

  const toggleDiscipline = (d: Discipline) => {
    const keys = keysFor(d);
    const allOn = keys.every((k) => selected.has(k));
    const next = new Set(selected);
    keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
    setSelected(next);
  };

  const toggleSub = (subId: number) => {
    const next = new Set(selected);
    const k = `s:${subId}`;
    next.has(k) ? next.delete(k) : next.add(k);
    setSelected(next);
  };

  const toggleOpen = (id: number) => {
    const next = new Set(open);
    next.has(id) ? next.delete(id) : next.add(id);
    setOpen(next);
  };

  const subscriptions = useMemo(() => {
    const out: { disciplineId: number; subDisciplineId: number | null }[] = [];
    for (const d of disciplines) {
      if (selected.has(`d:${d.id}`)) out.push({ disciplineId: d.id, subDisciplineId: null });
      for (const s of d.sub_disciplines) {
        if (selected.has(`s:${s.id}`)) out.push({ disciplineId: d.id, subDisciplineId: s.id });
      }
    }
    return out;
  }, [selected, disciplines]);

  const selectedDisciplineCount = useMemo(
    () => new Set(subscriptions.map((s) => s.disciplineId)).size,
    [subscriptions]
  );

  const handleSave = async () => {
    if (!user?.id || subscriptions.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await convex.mutation(api.userMirror.updateMyProfile, { subscriptions });
      await dispatch(fetchProfile(user.id));
      router.replace('/(app)');
    } catch (e) {
      console.error('[ONBOARDING] save failed:', e);
      setError("L'enregistrement a échoué. Réessayez.");
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (user?.id) {
      try {
        await AsyncStorage.setItem(onboardingSkippedKey(user.id), '1');
      } catch {}
    }
    router.replace('/(app)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleSection}>
        <Text style={styles.title}>Vos spécialités</Text>
        <Text style={styles.subtitle}>
          Choisissez les disciplines que vous souhaitez suivre. Vous pourrez les modifier à tout moment dans Paramètres.
        </Text>
      </View>

      {disciplines.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {disciplines.map((d) => {
            const keys = keysFor(d);
            const count = keys.filter((k) => selected.has(k)).length;
            const state = count === 0 ? 'none' : count === keys.length ? 'all' : 'some';
            const isOpen = open.has(d.id);
            return (
              <View key={d.id} style={styles.disciplineBlock}>
                <View style={styles.row}>
                  <Pressable
                    onPress={() => toggleDiscipline(d)}
                    style={styles.rowMain}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: state === 'all' ? true : state === 'some' ? 'mixed' : false }}
                    accessibilityLabel={d.name}
                  >
                    <View style={[styles.checkbox, state !== 'none' && styles.checkboxOn]}>
                      {state === 'all' && <Ionicons name="checkmark" size={16} color={COLORS.text.white} />}
                      {state === 'some' && <Ionicons name="remove" size={16} color={COLORS.text.white} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.disciplineName}>{d.name}</Text>
                      {d.sub_disciplines.length > 0 && count > 0 && (
                        <Text style={styles.countText}>
                          {count}/{keys.length} sous-spécialités
                        </Text>
                      )}
                    </View>
                  </Pressable>
                  {d.sub_disciplines.length > 0 && (
                    <Pressable
                      onPress={() => toggleOpen(d.id)}
                      style={styles.chevron}
                      accessibilityLabel={`${isOpen ? 'Masquer' : 'Afficher'} les sous-spécialités ${d.name}`}
                    >
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={COLORS.text.tertiary}
                      />
                    </Pressable>
                  )}
                </View>
                {isOpen &&
                  d.sub_disciplines.map((s) => {
                    const on = selected.has(`s:${s.id}`);
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => toggleSub(s.id)}
                        style={styles.subRow}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={s.name}
                      >
                        <View style={[styles.checkboxSmall, on && styles.checkboxOn]}>
                          {on && <Ionicons name="checkmark" size={13} color={COLORS.text.white} />}
                        </View>
                        <Text style={styles.subName}>{s.name}</Text>
                      </Pressable>
                    );
                  })}
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Pressable
          onPress={handleSave}
          disabled={saving || subscriptions.length === 0}
          style={({ pressed }) => [
            styles.saveButton,
            (saving || subscriptions.length === 0) && styles.saveButtonDisabled,
            pressed && styles.saveButtonPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.text.white} />
          ) : (
            <Text style={styles.saveButtonText}>
              {selectedDisciplineCount > 0
                ? `Continuer (${selectedDisciplineCount} discipline${selectedDisciplineCount > 1 ? 's' : ''})`
                : 'Choisissez au moins une discipline'}
            </Text>
          )}
        </Pressable>
        <Pressable onPress={handleSkip} disabled={saving} style={styles.skipButton}>
          <Text style={styles.skipText}>Plus tard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  titleSection: {
    paddingTop: Platform.OS === 'ios' ? 72 : 48,
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.display.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.lg,
  },
  disciplineBlock: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  chevron: {
    padding: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSmall: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  disciplineName: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
  },
  countText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING['2xl'],
    gap: SPACING.md,
  },
  subName: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    flex: 1,
  },
  footer: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.primary,
  },
  errorText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  saveButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: RADIUS.button,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  saveButtonDisabled: {
    opacity: 0.45,
    ...SHADOWS.none,
  },
  saveButtonPressed: {
    backgroundColor: COLORS.primary.dark,
  },
  saveButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.white,
  },
  skipButton: {
    alignItems: 'center',
    paddingTop: SPACING.md,
  },
  skipText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.tertiary,
    textDecorationLine: 'underline',
  },
});

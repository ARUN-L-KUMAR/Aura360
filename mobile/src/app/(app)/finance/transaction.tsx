import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useDeleteTransaction, useSaveTransaction } from '@/features/finance/hooks';
import {
  CATEGORY_OPTIONS,
  PAYMENT_METHODS,
  type EditableTransactionType,
  type PaymentMethod,
  type Transaction,
} from '@/features/finance/types';
import { ApiError } from '@/lib/api';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const TYPE_OPTIONS: { value: EditableTransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'investment', label: 'Investment' },
];

const PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000];

const CUSTOM = '__custom__';

function parseTransaction(raw?: string): Transaction | null {
  try {
    return raw ? (JSON.parse(raw) as Transaction) : null;
  } catch {
    return null;
  }
}

export default function TransactionScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ tx?: string }>();
  const existing = useMemo(() => parseTransaction(params.tx), [params.tx]);
  const isTransfer = existing?.type === 'transfer';

  const initialType: EditableTransactionType = existing && existing.type !== 'transfer' ? existing.type : 'expense';
  const knownCategory = existing ? CATEGORY_OPTIONS[initialType].includes(existing.category) : false;

  const [type, setType] = useState<EditableTransactionType>(initialType);
  const [amount, setAmount] = useState(existing ? String(Number(existing.amount)) : '');
  const [category, setCategory] = useState(existing ? (knownCategory ? existing.category : CUSTOM) : '');
  const [customCategory, setCustomCategory] = useState(existing && !knownCategory ? existing.category : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existing?.paymentMethod ?? 'upi');
  const [description, setDescription] = useState(existing && existing.description !== 'No description' ? existing.description : '');
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? toIsoDay(new Date()));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const descriptionRef = useRef<TextInput>(null);
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();

  const finalCategory = category === CUSTOM ? customCategory.trim() : category;

  const typeColor =
    type === 'expense'
      ? colors.danger
      : type === 'income'
        ? colors.success
        : moduleColors.finance;

  function changeType(next: EditableTransactionType) {
    setType(next);
    if (category !== CUSTOM && !CATEGORY_OPTIONS[next].includes(category)) setCategory('');
  }

  function addPreset(val: number) {
    const cur = Number.parseFloat(amount.replace(/,/g, '')) || 0;
    setAmount(String(cur + val));
  }

  async function submit() {
    const value = Number.parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than 0.');
    if (!finalCategory) return setError('Choose a category.');

    setError(null);
    try {
      await save.mutateAsync({
        id: existing?.id,
        input: {
          type,
          amount: value,
          category: finalCategory,
          paymentMethod,
          description: description.trim(),
          notes: notes.trim() || null,
          date,
        },
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete transaction?', `${existing.description} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(existing.id);
            router.back();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Could not delete. Try again.');
          }
        },
      },
    ]);
  }

  if (isTransfer && existing) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ title: 'Transfer' }} />
        <Card style={{ gap: spacing.sm }}>
          <Text variant="heading">{existing.description}</Text>
          <Text muted>Transfers between accounts can only be deleted here.</Text>
        </Card>
        {error ? <Text color="danger">{error}</Text> : null}
        <Button title="Delete transfer" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
      </Screen>
    );
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit transaction' : 'New transaction' }} />

      {/* Type Switcher */}
      <Segmented options={TYPE_OPTIONS} value={type} onChange={changeType} />

      {/* Hero Amount Input Card */}
      <GlassCard
        glowColor={typeColor}
        style={{
          padding: spacing.lg,
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
          AMOUNT ({type.toUpperCase()})
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '700',
              color: typeColor,
              marginRight: 4,
            }}>
            {CURRENCY_SYMBOL}
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            autoFocus={!existing}
            style={{
              fontSize: 42,
              fontWeight: '800',
              color: colors.text,
              minWidth: 120,
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
              paddingVertical: 0,
            }}
          />
        </View>

        {/* Quick Presets */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' }}>
          {PRESET_AMOUNTS.map((val) => (
            <Pressable
              key={val}
              onPress={() => addPreset(val)}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.sm + 4,
                paddingVertical: spacing.xs + 2,
                borderRadius: radius.pill,
                backgroundColor: isDark ? 'rgba(34, 48, 65, 0.7)' : colors.cardMuted,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text variant="caption" style={{ fontWeight: '600', color: colors.text }}>
                +{CURRENCY_SYMBOL}{val >= 1000 ? `${val / 1000}k` : val}
              </Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      {/* Category Section */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} />
          <Text variant="label" muted>
            Category
          </Text>
        </View>
        <ChipGroup>
          {CATEGORY_OPTIONS[type].map((name) => (
            <Chip
              key={name}
              label={name}
              selected={category === name}
              color={typeColor}
              onPress={() => setCategory(name)}
            />
          ))}
          <Chip
            label="Custom…"
            selected={category === CUSTOM}
            color={typeColor}
            onPress={() => setCategory(CUSTOM)}
          />
        </ChipGroup>
        {category === CUSTOM ? (
          <Input
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder="Category name"
            returnKeyType="next"
            onSubmitEditing={() => descriptionRef.current?.focus()}
          />
        ) : null}
      </GlassCard>

      {/* Payment Method Section */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="card-outline" size={16} color={colors.textMuted} />
          <Text variant="label" muted>
            Paid with
          </Text>
        </View>
        <ChipGroup>
          {PAYMENT_METHODS.map((method) => (
            <Chip
              key={method.value}
              label={method.label}
              selected={paymentMethod === method.value}
              color={moduleColors.finance}
              onPress={() => setPaymentMethod(method.value)}
            />
          ))}
        </ChipGroup>
      </GlassCard>

      {/* Details Section */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <Input
          ref={descriptionRef}
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What was this for?"
          returnKeyType="done"
        />

        <DateField label="Date" value={date} onChange={(next) => next && setDate(next)} />

        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Add extra context or details…"
          style={{ minHeight: 64, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </GlassCard>

      {error ? (
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: `${colors.danger}18`,
            borderWidth: 1,
            borderColor: `${colors.danger}40`,
          }}>
          <Text color="danger" style={{ fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button
        title={existing ? 'Save changes' : 'Add transaction'}
        onPress={submit}
        loading={save.isPending}
      />
      {existing ? (
        <Button
          title="Delete transaction"
          variant="ghost"
          onPress={confirmDelete}
          loading={remove.isPending}
        />
      ) : null}
    </Screen>
  );
}

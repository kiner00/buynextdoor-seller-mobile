import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useCreateWithdrawal, useWalletBalance } from '../../src/api/domains/wallet';
import { useSellerMe } from '../../src/api/domains/seller';
import { ApiError, NetworkError } from '../../src/api/errors';
import { formatMoney } from '../../src/lib/format';
import { Button, Card, Field, Muted, Screen, Text } from '../../src/ui';

export default function WithdrawScreen() {
  const balance = useWalletBalance();
  const me = useSellerMe();
  const createWithdrawal = useCreateWithdrawal();

  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  // The seller's payout account is already on their profile. Offering it
  // rather than auto-filling keeps them looking at where the money goes —
  // this is the one form where a stale account number is expensive.
  const profile = me.data?.hub_owner;
  const hasSavedAccount = Boolean(profile?.payment_bank_account_number) && !prefilled;

  const available = balance.data?.balance ?? 0;
  const value = Number(amount);
  const overBalance = Number.isFinite(value) && value > available;
  const canSubmit =
    Number.isFinite(value) &&
    value >= 1 &&
    !overBalance &&
    bankName.trim().length > 0 &&
    accountNumber.trim().length > 0 &&
    accountName.trim().length > 0 &&
    !createWithdrawal.isPending;

  const submit = async () => {
    try {
      await createWithdrawal.mutateAsync({
        amount: value,
        bank_name: bankName.trim(),
        bank_account_number: accountNumber.trim(),
        bank_account_name: accountName.trim(),
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
      });
      Alert.alert('Withdrawal requested', 'An admin will review it shortly.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        'Could not send the request',
        error instanceof NetworkError
          ? error.message
          : error instanceof ApiError
            ? (error.firstFieldError ?? error.message)
            : 'Something went wrong.',
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Withdraw' }} />
      <Screen>
        <View className="gap-4 p-4">
          <Card className="gap-1">
            <Muted>Available balance</Muted>
            <Text className="text-2xl font-semibold">{formatMoney(available)}</Text>
          </Card>

          <Field
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            error={overBalance ? 'More than your available balance.' : null}
            editable={!createWithdrawal.isPending}
          />

          {hasSavedAccount ? (
            <Button
              label="Use my saved payout account"
              variant="secondary"
              onPress={() => {
                const account = me.data?.hub_owner;
                if (!account) return;
                setBankName(account.payment_bank_name ?? '');
                setAccountNumber(account.payment_bank_account_number ?? '');
                setAccountName(account.payment_bank_account_name ?? '');
                setPrefilled(true);
              }}
            />
          ) : null}

          <Field
            label="Bank"
            value={bankName}
            onChangeText={setBankName}
            placeholder="BDO, BPI, GCash…"
            editable={!createWithdrawal.isPending}
          />
          <Field
            label="Account number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="number-pad"
            editable={!createWithdrawal.isPending}
          />
          <Field
            label="Account name"
            value={accountName}
            onChangeText={setAccountName}
            editable={!createWithdrawal.isPending}
          />
          <Field
            label="Note"
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Optional"
            multiline
            numberOfLines={3}
            editable={!createWithdrawal.isPending}
          />

          <Button
            label="Send request"
            onPress={submit}
            loading={createWithdrawal.isPending}
            disabled={!canSubmit}
          />
          <Muted>An admin reviews every withdrawal before it is paid out.</Muted>
        </View>
      </Screen>
    </>
  );
}

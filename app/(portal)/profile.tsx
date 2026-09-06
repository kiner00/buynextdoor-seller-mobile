import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSellerMe, type SellerMePayload } from '../../src/api/domains/seller';
import { useUpdateHubDetails } from '../../src/api/domains/profile';
import { ApiError, NetworkError } from '../../src/api/errors';
import { Button, Card, ErrorState, Field, LoadingState, Muted, Screen, Text } from '../../src/ui';

export default function ProfileScreen() {
  const me = useSellerMe();

  if (me.isPending) return <LoadingState />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  return <ProfileForm me={me.data} />;
}

function ProfileForm({ me }: { me: SellerMePayload }) {
  const update = useUpdateHubDetails();
  const hub = me.hub_owner;
  const social = hub as { facebook?: string | null; viber?: string | null };

  const [name, setName] = useState(hub.name ?? '');
  const [contactPerson, setContactPerson] = useState(hub.contact_person ?? '');
  const [contactNumber, setContactNumber] = useState(hub.contact_number ?? '');
  const [facebook, setFacebook] = useState(social.facebook ?? '');
  const [viber, setViber] = useState(social.viber ?? '');
  const [bankName, setBankName] = useState(hub.payment_bank_name ?? '');
  const [accountNumber, setAccountNumber] = useState(hub.payment_bank_account_number ?? '');
  const [accountName, setAccountName] = useState(hub.payment_bank_account_name ?? '');

  const save = async () => {
    try {
      // Only what can change here; the API's rules are all `sometimes`.
      await update.mutateAsync({
        name: name.trim(),
        contact_person: contactPerson.trim(),
        contact_number: contactNumber.trim(),
        facebook: facebook.trim() || null,
        viber: viber.trim() || null,
        ...(bankName.trim() ? { payment_bank_name: bankName.trim() } : {}),
        ...(accountNumber.trim() ? { payment_bank_account_number: accountNumber.trim() } : {}),
        ...(accountName.trim() ? { payment_bank_account_name: accountName.trim() } : {}),
      });
      Alert.alert('Saved', 'Your profile is updated.');
    } catch (error) {
      Alert.alert(
        'Could not save',
        error instanceof ApiError
          ? (error.firstFieldError ?? error.message)
          : error instanceof NetworkError
            ? error.message
            : 'Something went wrong.',
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Seller profile' }} />
      <Screen>
        <View className="gap-4 p-4">
          <Card className="gap-0.5">
            <Text className="font-semibold">{hub.name ?? 'Seller'}</Text>
            <Muted>{hub.code ?? ''}</Muted>
            <Muted>{me.user.email}</Muted>
          </Card>

          <Text className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
            Store
          </Text>
          <Field label="Store name" value={name} onChangeText={setName} />
          <Field label="Contact person" value={contactPerson} onChangeText={setContactPerson} />
          <Field
            label="Contact number"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
          />
          <Field
            label="Facebook"
            value={facebook}
            onChangeText={setFacebook}
            autoCapitalize="none"
            placeholder="Optional"
          />
          <Field
            label="Viber"
            value={viber}
            onChangeText={setViber}
            keyboardType="phone-pad"
            placeholder="Optional"
          />

          <Text className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
            Payout account
          </Text>
          <Field label="Bank" value={bankName} onChangeText={setBankName} />
          <Field
            label="Account number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="number-pad"
          />
          <Field label="Account name" value={accountName} onChangeText={setAccountName} />

          <Button label="Save" onPress={() => void save()} loading={update.isPending} />
          <Muted>Photos, IDs and compliance documents are uploaded on the seller website.</Muted>
        </View>
      </Screen>
    </>
  );
}

import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  type Branch,
} from '../../../src/api/domains/branches';
import { ApiError, NetworkError } from '../../../src/api/errors';
import { Button, Field, LoadingState, Screen } from '../../../src/ui';

/** Create (`/branch/new`) or edit (`/branch/{id}`) — one form, two doors. */
export default function BranchFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const branches = useBranches();

  if (!isNew && branches.isPending) return <LoadingState />;

  const existing = isNew ? undefined : branches.data?.find((b) => String(b.id) === id);

  return <BranchForm key={id} id={id ?? 'new'} existing={existing} />;
}

function BranchForm({ id, existing }: { id: string; existing: Branch | undefined }) {
  const isNew = id === 'new';
  const create = useCreateBranch();
  const update = useUpdateBranch();

  const [name, setName] = useState(existing?.name ?? '');
  const [addressOne, setAddressOne] = useState(existing?.address_one ?? '');
  const [barangay, setBarangay] = useState(existing?.barangay ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [province, setProvince] = useState(existing?.province ?? '');
  const [postal, setPostal] = useState(existing?.postal_code ?? '');
  const [contact, setContact] = useState(existing?.contact_number ?? '');

  const busy = create.isPending || update.isPending;

  const save = async () => {
    const input = {
      name: name.trim(),
      address_one: addressOne.trim() || null,
      barangay: barangay.trim() || null,
      city: city.trim() || null,
      province: province.trim() || null,
      postal_code: postal.trim() || null,
      contact_number: contact.trim() || null,
    };
    try {
      if (isNew) await create.mutateAsync(input);
      else await update.mutateAsync({ id: Number(id), ...input });
      router.back();
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
      <Stack.Screen options={{ title: isNew ? 'New branch' : (existing?.name ?? 'Branch') }} />
      <Screen>
        <View className="gap-4 p-4">
          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Street address" value={addressOne} onChangeText={setAddressOne} />
          <Field label="Barangay" value={barangay} onChangeText={setBarangay} />
          <Field label="City" value={city} onChangeText={setCity} />
          <Field label="Province" value={province} onChangeText={setProvince} />
          <Field
            label="Postal code"
            value={postal}
            onChangeText={setPostal}
            keyboardType="number-pad"
          />
          <Field
            label="Contact number"
            value={contact}
            onChangeText={setContact}
            keyboardType="phone-pad"
          />
          <Button
            label={isNew ? 'Create branch' : 'Save'}
            onPress={() => void save()}
            loading={busy}
            disabled={name.trim().length === 0}
          />
        </View>
      </Screen>
    </>
  );
}

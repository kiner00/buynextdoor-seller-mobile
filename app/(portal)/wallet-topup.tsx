import { useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, X } from 'lucide-react-native';
import { useCreateTopup } from '../../src/api/domains/wallet';
import { ApiError, NetworkError } from '../../src/api/errors';
import { Button, Card, Field, Muted, Screen, Text } from '../../src/ui';
import { colors } from '../../src/theme/tokens';

type Proof = { uri: string; name: string; mimeType: string };

/**
 * Request a wallet top-up.
 *
 * The proof of payment is the reason this screen is better on a phone than on
 * the web: the seller is holding the deposit slip, and the camera is right
 * there. Web makes them photograph it, move it to a computer and pick a file.
 */
export default function TopupScreen() {
  const createTopup = useCreateTopup();

  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState('');
  const [remarks, setRemarks] = useState('');
  const [proof, setProof] = useState<Proof | null>(null);

  const attach = async (source: 'camera' | 'library') => {
    // Permission is requested at the moment it is needed, with the deposit
    // slip in hand — asking on app launch, out of context, is what gets a
    // permission denied forever.
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'Allow camera access to photograph your deposit slip.'
          : 'Allow photo access to attach your deposit slip.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
          });

    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    setProof({
      uri: asset.uri,
      name: asset.fileName ?? `proof-${Date.now()}.jpg`,
      // The API only accepts jpg/jpeg/png/pdf, and quality-compressed camera
      // output is always JPEG, so fall back to that rather than to a type the
      // validator would reject.
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const value = Number(amount);
  const canSubmit = Number.isFinite(value) && value >= 1 && !createTopup.isPending;

  const submit = async () => {
    try {
      await createTopup.mutateAsync({
        amount: value,
        ...(receipt.trim() ? { payment_receipt_number: receipt.trim() } : {}),
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
        ...(proof ? { proof } : {}),
      });
      Alert.alert('Top-up requested', 'An admin will review it shortly.', [
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
      <Stack.Screen options={{ title: 'Top up wallet' }} />
      <Screen>
        <View className="gap-4 p-4">
          <Field
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            hint="How much you deposited, in pesos."
            editable={!createTopup.isPending}
          />
          <Field
            label="Receipt or reference number"
            value={receipt}
            onChangeText={setReceipt}
            placeholder="Optional"
            autoCapitalize="characters"
            editable={!createTopup.isPending}
          />

          <Card className="gap-3">
            <Text className="font-semibold">Proof of payment</Text>
            {proof ? (
              <View className="gap-3">
                <View className="overflow-hidden rounded-lg border border-neutral-200">
                  <Image
                    source={{ uri: proof.uri }}
                    style={{ width: '100%', height: 220 }}
                    resizeMode="cover"
                  />
                </View>
                <Pressable
                  onPress={() => setProof(null)}
                  accessibilityRole="button"
                  className="flex-row items-center gap-2 self-start active:opacity-60"
                >
                  <X size={16} color={colors.danger} />
                  <Text className="text-[14px] text-red-600">Remove photo</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <Attach
                  icon={<Camera size={18} color={colors.neutral[700]} />}
                  label="Take photo"
                  onPress={() => void attach('camera')}
                />
                <Attach
                  icon={<ImageIcon size={18} color={colors.neutral[700]} />}
                  label="Choose file"
                  onPress={() => void attach('library')}
                />
              </View>
            )}
            <Muted>JPG or PNG, up to 10MB. Optional, but it speeds up approval.</Muted>
          </Card>

          <Field
            label="Note"
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Optional"
            multiline
            numberOfLines={3}
            editable={!createTopup.isPending}
          />

          <Button
            label="Send request"
            onPress={submit}
            loading={createTopup.isPending}
            disabled={!canSubmit}
          />
        </View>
      </Screen>
    </>
  );
}

function Attach({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white py-3 active:bg-neutral-100"
    >
      {icon}
      <Text className="text-[14px] font-medium">{label}</Text>
    </Pressable>
  );
}

import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  useStoreProfile,
  useUpsertStoreProfile,
  type StoreProfile,
} from '../../src/api/domains/profile';
import { useFeatureAccess } from '../../src/api/domains/billing';
import { ApiError, NetworkError } from '../../src/api/errors';
import { Button, Card, ErrorState, Field, LoadingState, Muted, Screen, Text } from '../../src/ui';

/** The copy on the seller's public storefront. Images stay on the website. */
export default function StorefrontScreen() {
  const profile = useStoreProfile();
  const access = useFeatureAccess();

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) {
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  }

  // The form is mounted only once the profile exists, so its fields start
  // from the loaded values instead of being patched in by an effect.
  return (
    <StorefrontForm
      profile={profile.data}
      canEdit={access.data?.features.store_profile_edit ?? true}
    />
  );
}

function StorefrontForm({ profile, canEdit }: { profile: StoreProfile; canEdit: boolean }) {
  const upsert = useUpsertStoreProfile();
  const [tagline, setTagline] = useState(profile.store_tagline ?? '');
  const [description, setDescription] = useState(profile.store_description ?? '');
  const [announcement, setAnnouncement] = useState(profile.announcement_text ?? '');

  const save = async () => {
    try {
      await upsert.mutateAsync({
        store_tagline: tagline.trim() || null,
        store_description: description.trim() || null,
        announcement_text: announcement.trim() || null,
      });
      Alert.alert('Saved', 'Your storefront is updated.');
    } catch (error) {
      Alert.alert(
        'Could not save',
        error instanceof NetworkError || error instanceof ApiError
          ? error instanceof ApiError
            ? (error.firstFieldError ?? error.message)
            : error.message
          : 'Something went wrong.',
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Online storefront' }} />
      <Screen>
        <View className="gap-4 p-4">
          {!canEdit ? (
            <Card className="border-amber-200 bg-amber-50">
              <Text className="text-[14px] text-amber-800">
                Your plan doesn&apos;t include storefront editing.
              </Text>
            </Card>
          ) : null}
          <Field
            label="Tagline"
            value={tagline}
            onChangeText={setTagline}
            editable={canEdit}
            maxLength={255}
          />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            editable={canEdit}
            multiline
            numberOfLines={5}
          />
          <Field
            label="Announcement"
            value={announcement}
            onChangeText={setAnnouncement}
            editable={canEdit}
            maxLength={300}
            hint="Shown at the top of your storefront. 300 characters."
            multiline
            numberOfLines={3}
          />
          <Button
            label="Save"
            onPress={() => void save()}
            loading={upsert.isPending}
            disabled={!canEdit}
          />
          <Muted>Banner, logo, theme and featured products are set on the seller website.</Muted>
        </View>
      </Screen>
    </>
  );
}

import { Alert, Share, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import {
  useLogPostingUsage,
  usePostingDetail,
  type PostingMaterial,
  type PostingVariant,
} from '../../../src/api/domains/postingMaterials';
import { Button, Card, ErrorState, LoadingState, Muted, Screen, Text } from '../../../src/ui';
import { colors } from '../../../src/theme/tokens';

export default function PostingDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const detail = usePostingDetail(Number(productId));
  const log = useLogPostingUsage();

  if (detail.isPending) return <LoadingState />;
  if (detail.isError)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;

  const { item, materials } = detail.data;

  const share = async (material: PostingMaterial, variant: PostingVariant) => {
    // The native share sheet — into Facebook, Messenger, Viber — is why this
    // is better on a phone than the web's copy-then-paste. Media travels as a
    // link: the share sheet on both platforms takes text, and a caption with
    // the image URL attached is what most targets render best anyway.
    const image = variant.media[0]?.url;
    await Share.share({ message: image ? `${variant.caption}\n\n${image}` : variant.caption });
    log.mutate({ materialId: material.id, variantId: variant.id, channel: 'share_sheet' });
  };

  const copy = async (material: PostingMaterial, variant: PostingVariant) => {
    await Clipboard.setStringAsync(variant.caption);
    Alert.alert('Copied', 'Caption is on the clipboard.');
    log.mutate({ materialId: material.id, variantId: variant.id, channel: 'clipboard' });
  };

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />
      <Screen>
        <View className="gap-4 p-4">
          {materials.length === 0 ? (
            <Muted>No posts for this product yet.</Muted>
          ) : (
            materials.map((material) => (
              <Card key={material.id} className="gap-3">
                <View>
                  <Text className="font-semibold">{material.post_type ?? 'Post'}</Text>
                  {material.post_style ? (
                    <Muted className="text-[12px]">{material.post_style}</Muted>
                  ) : null}
                </View>
                {material.variants.map((variant) => (
                  <View key={variant.id} className="gap-2 rounded-lg border border-neutral-200 p-3">
                    <Muted className="text-[12px]">
                      Variant {variant.label} · {variant.char_count} chars
                    </Muted>
                    {variant.media[0]?.url ? (
                      <Image
                        source={{ uri: variant.media[0].url }}
                        style={{
                          width: '100%',
                          height: 180,
                          borderRadius: 8,
                          backgroundColor: colors.neutral[100],
                        }}
                        contentFit="cover"
                      />
                    ) : null}
                    <Text className="text-[14px] leading-5" selectable>
                      {variant.caption}
                    </Text>
                    <View className="flex-row gap-2">
                      <Button
                        label="Share"
                        onPress={() => void share(material, variant)}
                        className="flex-1"
                      />
                      <Button
                        label="Copy"
                        variant="secondary"
                        onPress={() => void copy(material, variant)}
                        className="flex-1"
                      />
                    </View>
                  </View>
                ))}
              </Card>
            ))
          )}
        </View>
      </Screen>
    </>
  );
}

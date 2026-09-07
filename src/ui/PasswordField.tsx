import { forwardRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Field, type FieldProps } from './Field';
import { MIN_TOUCH_TARGET, colors } from '../theme/tokens';

/**
 * A password input with a show/hide toggle, like the web's PasswordInput.
 * On a phone, where a typo is easy and autocorrect is off, seeing what you
 * typed is worth more than on a desktop.
 */
export const PasswordField = forwardRef<TextInput, Omit<FieldProps, 'secureTextEntry'>>(
  function PasswordField(props, ref) {
    const [shown, setShown] = useState(false);
    return (
      <View>
        <Field
          ref={ref}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
          className={props.className}
        />
        <Pressable
          onPress={() => setShown((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={shown ? 'Hide password' : 'Show password'}
          className="absolute right-0 items-center justify-center"
          // Sits over the input's right edge, below the label row.
          style={{ top: 22, width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
        >
          {shown ? (
            <EyeOff size={18} color={colors.neutral[500]} />
          ) : (
            <Eye size={18} color={colors.neutral[500]} />
          )}
        </Pressable>
      </View>
    );
  },
);

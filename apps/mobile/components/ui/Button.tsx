import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native'
import theme from '@/lib/theme'

interface ButtonProps extends TouchableOpacityProps {
  title: string
  loading?: boolean
  variant?: 'primary' | 'outline' | 'danger'
}

export function Button({ title, loading, variant = 'primary', style, ...props }: ButtonProps) {
  const isPrimary = variant === 'primary'
  const isOutline = variant === 'outline'
  const isDanger = variant === 'danger'

  return (
    <TouchableOpacity
      className={`rounded-xl py-4 items-center justify-center flex-row gap-2 ${
        isPrimary ? 'opacity-90' : isOutline ? 'border-2 bg-transparent' : 'bg-red-500'
      }`}
      style={[
        isPrimary ? { backgroundColor: theme.primary } : isOutline ? { borderColor: theme.primary } : {},
        style as any,
      ]}
      disabled={loading}
      {...props}
    >
      {loading && <ActivityIndicator color={isPrimary ? '#fff' : theme.primary} size="small" />}
      <Text
        className={`font-semibold text-base ${
          isPrimary || isDanger ? 'text-white' : ''
        }`}
        style={isOutline ? { color: theme.primary } : {}}
      >
        {title}
      </Text>
    </TouchableOpacity>
  )
}

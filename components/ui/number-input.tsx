'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'

type BaseInputProps = React.ComponentProps<typeof Input>

export interface NumberInputProps extends Omit<BaseInputProps, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined
  onChange: (value: number) => void
  /** Allow negative numbers. Default false. */
  allowNegative?: boolean
  /** Round to N decimal places on blur. -1 disables rounding. Default -1. */
  decimals?: number
  /** Auto-select all text on focus so the user can immediately overtype. Default true. */
  selectOnFocus?: boolean
}

const formatProp = (v: number | null | undefined): string =>
  v == null || Number.isNaN(v) ? '' : String(v)

const isPartial = (s: string): boolean =>
  s === '' || s === '-' || s === '.' || s === '-.'

export function NumberInput({
  value,
  onChange,
  allowNegative = false,
  decimals = -1,
  selectOnFocus = true,
  onFocus,
  onBlur,
  ...rest
}: NumberInputProps) {
  const [text, setText] = React.useState(() => formatProp(value))
  const [lastEmitted, setLastEmitted] = React.useState<number | null | undefined>(value)

  // Re-sync text from prop when value changes externally (not via our own onChange)
  if (value !== lastEmitted) {
    setLastEmitted(value)
    setText(formatProp(value))
  }

  const validRegex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        if (selectOnFocus) e.currentTarget.select()
        onFocus?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value
        if (raw !== '' && !validRegex.test(raw)) return
        setText(raw)
        const parsed = isPartial(raw) ? 0 : parseFloat(raw)
        const next = Number.isNaN(parsed) ? 0 : parsed
        setLastEmitted(next)
        onChange(next)
      }}
      onBlur={(e) => {
        if (!isPartial(text)) {
          const parsed = parseFloat(text)
          if (!Number.isNaN(parsed)) {
            const rounded = decimals >= 0 ? Number(parsed.toFixed(decimals)) : parsed
            const formatted = String(rounded)
            if (formatted !== text) setText(formatted)
            if (rounded !== lastEmitted) {
              setLastEmitted(rounded)
              onChange(rounded)
            }
          }
        }
        onBlur?.(e)
      }}
    />
  )
}

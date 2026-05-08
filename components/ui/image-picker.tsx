'use client'

import * as React from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

interface ImagePickerProps {
  value?: string | null
  onChange: (url: string | null) => void
  className?: string
  size?: Size
  /** Override the default placeholder icon/text. */
  placeholder?: React.ReactNode
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
}

export function ImagePicker({
  value,
  onChange,
  className,
  size = 'md',
  placeholder,
}: ImagePickerProps) {
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }
    setUploading(true)
    const { data, error } = await api.upload(file)
    setUploading(false)
    if (error || !data) {
      alert('上传失败: ' + (error?.message || ''))
      return
    }
    onChange(data.url)
  }

  return (
    <div className={cn('relative inline-block', SIZE_CLASS[size], className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          'relative w-full h-full rounded-xl overflow-hidden bg-secondary',
          'border-2 border-dashed border-muted-foreground/25',
          'hover:bg-secondary/80 transition-colors',
          'flex flex-col items-center justify-center gap-1 text-muted-foreground',
          uploading && 'opacity-60 cursor-wait',
        )}
      >
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : uploading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          placeholder ?? (
            <>
              <Camera size={20} />
              <span className="text-[10px]">点击上传</span>
            </>
          )
        )}
        {uploading && value && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="animate-spin text-white" size={20} />
          </div>
        )}
      </button>
      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition-colors"
          title="移除图片"
        >
          <X size={10} />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

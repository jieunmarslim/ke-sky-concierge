"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Toggle as TogglePrimitive } from "radix-ui"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[6px] text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] outline-none cursor-pointer text-[#515154] hover:text-[#1D1D1F] focus-visible:ring-[3px] focus-visible:ring-[#0071E3]/25 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-white data-[state=on]:text-[#1D1D1F] data-[state=on]:shadow-[0_2px_8px_rgba(0,0,0,0.06)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "bg-transparent hover:bg-white/60",
      },
      size: {
        default: "h-8 min-w-9 px-3",
        sm: "h-7 min-w-8 px-2.5 text-xs",
        lg: "h-9 min-w-10 px-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }

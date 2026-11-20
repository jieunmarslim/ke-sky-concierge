import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,background-color] focus-visible:ring-[3px] focus-visible:ring-[#65B2E8]/45 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-[rgba(101,178,232,0.18)] text-[#8ED0FA]",
        secondary: "bg-[#0A1E5C] text-[#C5D5EA]",
        destructive: "bg-[rgba(224,58,62,0.18)] text-[#FF9494]",
        outline: "bg-[#0A1E5C] text-[#E6EFFA]",
        ghost: "text-[#8EA4C8] hover:bg-white/[0.08]",
        link: "text-[#8ED0FA] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-transparent bg-[#F5F5F7] px-3.5 py-2 text-base text-[#1D1D1F] transition-[background-color,border-color,box-shadow] outline-none selection:bg-[#0071E3] selection:text-white placeholder:text-[#86868B] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[#0071E3] focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[#0071E3]/15",
        "aria-invalid:border-[#FF3B30] aria-invalid:ring-[#FF3B30]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }

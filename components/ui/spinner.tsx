import * as React from "react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("size-4 animate-spin", className)}
      fill="none"
      role="status"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="8"
        cy="8"
        r="7"
        stroke="currentColor"
        strokeDasharray="32"
        strokeLinecap="round"
        strokeWidth="2"
        className="opacity-25"
      />
      <circle
        cx="8"
        cy="8"
        r="7"
        stroke="currentColor"
        strokeDasharray="32"
        strokeDashoffset="32"
        strokeLinecap="round"
        strokeWidth="2"
        className="opacity-75"
      >
        <animateTransform
          attributeName="transform"
          dur="0.75s"
          from="0 8 8"
          repeatCount="indefinite"
          to="360 8 8"
          type="rotate"
        />
      </circle>
    </svg>
  )
}

export { Spinner }

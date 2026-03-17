import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }) {
  return (
    <div
      className={cn("rounded-xl border border-gray-100 bg-white shadow-sm", className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-4", className)} {...props} />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <h3 className={cn("text-sm font-semibold text-gray-900", className)} {...props} />
  )
}

function CardContent({ className, ...props }) {
  return <div className={cn("p-4 pt-0", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent }

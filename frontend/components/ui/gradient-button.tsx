"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("gradient-button", {
  variants: {
    variant: {
      default: "",
      outline: "gradient-button-outline",
    },
    size: {
      default: "gradient-button-md",
      sm: "gradient-button-sm",
      lg: "gradient-button-lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={[buttonVariants({ variant, size }), className].filter(Boolean).join(" ")}
        ref={ref}
        {...props}
      />
    );
  }
);
GradientButton.displayName = "GradientButton";

export { GradientButton, buttonVariants };

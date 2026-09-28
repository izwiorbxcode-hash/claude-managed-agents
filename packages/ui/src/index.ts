/**
 * UI — shared component library placeholder.
 * Phase 3 will contain React/Tailwind primitives.
 */

export interface ButtonProps {
  readonly children: string;
  readonly disabled?: boolean | undefined;
  readonly onClick?: (() => void) | undefined;
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly variant?: "primary" | "secondary" | "ghost" | undefined;
}

export const Button = (_props: ButtonProps): string => "ui-button-placeholder";

export type ComponentProps<T extends Record<string, unknown>> = T & {
  readonly className?: string | undefined;
  readonly testId?: string | undefined;
};

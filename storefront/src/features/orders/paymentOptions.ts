export type PaymentOption = {
  id: string;
  label: string;
  description: string;
};

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "cash",
    label: "Cash on delivery",
    description: "Pay in cash when your order arrives.",
  },
  {
    id: "telebirr",
    label: "Telebirr transfer",
    description: "We will share a Telebirr number after confirmation.",
  },
  {
    id: "bank",
    label: "Bank transfer",
    description: "We will send bank details with your order confirmation.",
  },
];


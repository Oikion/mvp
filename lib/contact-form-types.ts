/**
 * Contact Form Types and Constants
 * 
 * Shared types and default values for the agent profile contact form.
 * Moved to lib/ to allow imports from both client and server components.
 */

/**
 * Contact form field types
 */
export type ContactFormFieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox";

export interface ContactFormField {
  id: string;
  type: ContactFormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select fields
  order: number;
}

export interface ContactFormSettings {
  enabled: boolean;
  fields: ContactFormField[];
}

/**
 * Default contact form fields
 */
export const DEFAULT_CONTACT_FORM_FIELDS: ContactFormField[] = [
  {
    id: "name",
    type: "text",
    label: "Full Name",
    placeholder: "Enter your full name",
    required: true,
    order: 0,
  },
  {
    id: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email",
    required: true,
    order: 1,
  },
  {
    id: "phone",
    type: "phone",
    label: "Phone",
    placeholder: "Enter your phone number",
    required: false,
    order: 2,
  },
  {
    id: "message",
    type: "textarea",
    label: "Message",
    placeholder: "How can I help you?",
    required: true,
    order: 3,
  },
];

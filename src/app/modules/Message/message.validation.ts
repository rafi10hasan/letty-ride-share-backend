import { z } from 'zod';

const messageSchema = z.object({
  text: z
    .string()
    .min(1, "text is required")
    .max(500, "Text is too long"),
  
  receiverId: z
    .string()
    .regex(/^[0-9a-fA-C]{24}$/i, "Invalid Receiver ID format")
});

const messageUpdateSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text is required').optional(),
  }),
});

export const MessageValidationSchema = {
  messageSchema,
  messageUpdateSchema,
};

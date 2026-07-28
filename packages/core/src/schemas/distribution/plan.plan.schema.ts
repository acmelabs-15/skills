import { z } from "zod";
import { lineRangeSchema } from "../base.js";

export const planSourceEntrySchema = z.object({
  path: z.string().min(1),
  hash: z.string().min(1),
  range: lineRangeSchema,
});

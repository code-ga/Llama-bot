import { evaluate, format } from "mathjs";
import { createFunctionHandler } from "openai-zod-functions";
import z from "zod";
import type { Context } from "./tool";

export const getMathTool = (ctx: Context) => {
  const functions = [
    createFunctionHandler({
      name: "execute_math_expression",
      description: "Executes a math expression. From mathjs.",
      schema: z.object({
        expression: z.string(),
      }),

      /**
       * This handler gets called with parsed/validated arguments typed by your schema.
       *
       * You can perform any (async) computation, and return any value you want.
       * Or just return args unchanged if you want to use tool output directly.
       */
      handler: async (args) => {
        const { expression } = args;
        const result = evaluate(expression);
        const formatted = format(result, { notation: 'fixed' });
        return {
          result: formatted
        };
      }
    })
  ];

  return functions
}
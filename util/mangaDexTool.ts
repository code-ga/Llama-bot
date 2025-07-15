import { Manga } from "mangadex-full-api";
import { createFunctionHandler } from "openai-zod-functions";
import z from "zod";
import type { Context } from "./tool";

export const getMangadexTool = (ctx: Context) => {
  return [
    createFunctionHandler({
      name: "search_manga",
      description: "Return the list of manga that match the query. Return empty array if not found. The service use is MangaDex API.",
      schema: z.object({
        query: z.string(),
        hasAvailableChapters: z.boolean().default(true).nullable().optional(),
        limit: z.number().int().min(1).max(100).default(10).nullable().optional(),
      }),
      handler: async (args) => {
        const { query, hasAvailableChapters, limit } = args;
        const data = await Manga.search({ limit: limit || 10, title: query, hasAvailableChapters: hasAvailableChapters || false, })
        return data;
      }
    }),
    createFunctionHandler({
      name: "get_manga_info",
      description: "Returns information about a manga. The service use is MangaDex API.",
      schema: z.object({
        manga_id: z.string(),
      }),
      handler: async (args) => {
        try {
          const { manga_id } = args;
          const manga = await Manga.get(manga_id);
          return manga;
        } catch (error) {
          return { error: "Manga not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "get_chapters_info_by_manga_id",
      description: "Returns information about a chapter. The service use is MangaDex API.",
      schema: z.object({
        manga_id: z.string({ description: "Manga ID of the chapter you want to get. This field cannot be empty" }),
      }),
      handler: async (args) => {
        try {
          const { manga_id: chapter_id } = args;
          const chapter = await Manga.getFeed(chapter_id);
          return chapter;
        } catch (error) {
          return { error: "Chapter not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "get_statistics_manga",
      description: "Returns statistics information about a manga. The service use is MangaDex API.",
      schema: z.object({
        page_ids: z.array(z.string()),
      }),
      handler: async (args) => {
        try {
          const { page_ids } = args;
          const page = await Manga.getStatistics(page_ids);
          return page;
        } catch (error) {
          return { error: "Page not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "search_and_get_first_result",
      description: "Returns information about a manga. They search and get first result. The service use is MangaDex API.",
      schema: z.object({
        query: z.string(),
      }),
      handler: async (args) => {
        try {
          const { query } = args;
          const cover = await Manga.getByQuery({ title: query, limit: 1 });
          return cover;
        } catch (error) {
          return { error: "Cover not found" }
        }
      }
    }),
    createFunctionHandler({
      name: "random_manga",
      description: "Returns a random manga. The service use is MangaDex API.",
      schema: z.object({}),
      handler: async (args) => {
        try {
          const cover = await Manga.getRandom();
          return cover;
        } catch (error) {
          return { error: "Cover not found" }
        }
      }
    })
  ]
}


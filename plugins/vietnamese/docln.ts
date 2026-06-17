import { Plugin } from "@typings/plugin";
import { FilterTypes, Filters } from "@libs/filterInputs";
import { fetchApi } from "@libs/fetch";
import { CheerioAPI, load as parseHTML } from "cheerio";
import { NovelStatus } from "@libs/novelStatus";

class DocLNPlugin implements Plugin.PluginBase {
  id = "docln";
  name = "DocLN";
  icon = "src/vie/docln/icon.png";
  site = "https://docln.net";
  version = "1.0.0";

  async popularNovels(
    page: number,
    { filters }: Plugin.PopularNovelsOptions<typeof this.filters>
  ): Promise<Plugin.NovelItem[]> {
    const sort = filters?.sort?.value || "view";
    const status = filters?.status?.value || "";
    const url = `${this.site}/danh-sach?sort=${sort}&status=${status}&page=${page}`;
    const result = await fetchApi(url);
    const body = await result.text();
    const $ = parseHTML(body);
    const novels: Plugin.NovelItem[] = [];

    $(".series-title a").each((_, el) => {
      const name = $(el).text().trim();
      const path = $(el).attr("href") || "";
      const cover = $(el).closest(".thumb-item-flow").find("img").attr("src") || "";
      if (name && path) {
        novels.push({ name, path: new URL(path, this.site).pathname, cover });
      }
    });

    return novels;
  }

  async parseNovelAndChapters(novelPath: string): Promise<Plugin.SourceNovel> {
    const url = this.site + novelPath;
    const result = await fetchApi(url);
    const body = await result.text();
    const $ = parseHTML(body);

    const novel: Plugin.SourceNovel = {
      path: novelPath,
      name: $("h1.title-name").text().trim(),
      cover: $(".book-cover img").attr("src"),
      summary: $(".summary-content").text().trim(),
      author: $(".info-item:contains('Tác giả') a").text().trim(),
      status:
        $(".info-item:contains('Trạng thái') .info-value").text().trim() === "Đang tiến hành"
          ? NovelStatus.Ongoing
          : NovelStatus.Completed,
      genres: $(".list-categories a")
        .map((_, el) => $(el).text().trim())
        .get()
        .join(", "),
      chapters: [],
    };

    $(".chapter-name a").each((_, el) => {
      const chName = $(el).text().trim();
      const chPath = $(el).attr("href") || "";
      novel.chapters!.push({
        name: chName,
        path: new URL(chPath, this.site).pathname,
        releaseTime: null,
        chapterNumber: novel.chapters!.length + 1,
      });
    });

    return novel;
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const url = this.site + chapterPath;
    const result = await fetchApi(url);
    const body = await result.text();
    const $ = parseHTML(body);
    return $("#chapter-content").html() || "";
  }

  async searchNovels(
    searchTerm: string,
    page: number
  ): Promise<Plugin.NovelItem[]> {
    const url = `${this.site}/tim-kiem?keyword=${encodeURIComponent(searchTerm)}&page=${page}`;
    const result = await fetchApi(url);
    const body = await result.text();
    const $ = parseHTML(body);
    const novels: Plugin.NovelItem[] = [];

    $(".series-title a").each((_, el) => {
      const name = $(el).text().trim();
      const path = $(el).attr("href") || "";
      const cover = $(el).closest(".thumb-item-flow").find("img").attr("src") || "";
      if (name && path) {
        novels.push({ name, path: new URL(path, this.site).pathname, cover });
      }
    });

    return novels;
  }

  filters = {
    sort: {
      label: "Sắp xếp",
      options: [
        { label: "Lượt xem", value: "view" },
        { label: "Mới nhất", value: "time" },
        { label: "Đánh giá", value: "rate" },
      ],
      type: FilterTypes.Picker,
      value: "view",
    },
    status: {
      label: "Trạng thái",
      options: [
        { label: "Tất cả", value: "" },
        { label: "Đang tiến hành", value: "ongoing" },
        { label: "Hoàn thành", value: "completed" },
      ],
      type: FilterTypes.Picker,
      value: "",
    },
  } satisfies Filters;
}

export default new DocLNPlugin();

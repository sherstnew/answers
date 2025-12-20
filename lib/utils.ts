import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Task, Test } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getTest(testId: number): Promise<Test> {
  const hdrs = await getHeaderValues();
  const myHeaders = buildHeaders(hdrs);

  try {
    const res = await fetch(
      `https://uchebnik.mos.ru/webtests/exam/rest/secure/spec/${testId}`,
      {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
        next: { revalidate: 0 },
      }
    );
    if (res.status === 401) {
      throw new HTTPError("Unauthorized", 401);
    }
    if (!res.ok) {
      throw new HTTPError(`Failed to fetch answers for testId ${testId}`, res.status);
    }
    const data = await res.json();
    // console.log("Fetched data:", JSON.stringify(data.test_groups[0].tasks, null, 2));
    // const data = testres as any;
    return {
      name: data.basic_info.name,
      tasks: data.test_groups[0].tasks,
    };
  } catch (error) {
    console.error("Error fetching answers:", error);
    return { name: "", tasks: [] };
  }
}

export async function searchByName(name: string) {
  try {
    const url = "https://uchebnik.mos.ru/search/api/v3/materials";
    const hdrs = await getHeaderValues();
    const myHeaders = buildHeaders(hdrs);

    const raw = JSON.stringify({
      query: { search: name },
      sort: { field: "score", order: "desc" },
      page: 1,
      per_page: 10,
      scope: "catalogue",
    });

    const requestOptions: any = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
      next: { revalidate: 0 },
    };

    // Ensure content-type for POST
    if (!myHeaders.has("Content-Type")) {
      myHeaders.set("Content-Type", "application/json;charset=UTF-8");
    }

    const res = await fetch(url, requestOptions as any);

    if (res.status === 401) {
      throw new HTTPError("Unauthorized", 401);
    }

    if (!res.ok) {
      throw new HTTPError(`Search failed: ${res.status} ${res.statusText}`, res.status);
    }

    const data = await res.json();

    if (!data || !Array.isArray(data.data)) return [];

    const normalized = data.data.filter((item: any) => {
      const tags = item.tags || [];
      return tags.some((t: any) => {
        const nameLower = (t.name || "").toString().toLowerCase();
        const type = (t.type || t.tag_type || "").toString().toLowerCase();
        return nameLower === "цдз" && type === "special";
      });
    });

    return normalized;
  } catch (error) {
    console.error("searchByName error", error);
    return [];
  }
}

async function getHeaderValues(): Promise<Record<string, string>> {
  const defaults: Record<string, string> = {
    "User-Id": "",
    "Profile-Id": "",
    Profile: '',
    Authorization: "",
  };

  // If running on server, try to read config file
  if (typeof window === "undefined") {
    try {
      const fs = (await import("fs")).promises;
      const path = (await import("path")).default;
      const p = path.join(process.cwd(), "data", "uchebnik-headers.json");
      const raw = await fs.readFile(p, "utf-8");
      const cfg = JSON.parse(raw || "{}");
      return { ...defaults, ...cfg };
    } catch (e) {
      return defaults;
    }
  }

  // Client-side: return defaults
  return defaults;
}

function buildHeaders(obj: Record<string, string>) {
  const h = new Headers();
  if (obj["User-Id"]) h.append("User-Id", obj["User-Id"]);
  if (obj["Profile-Id"]) h.append("Profile-Id", obj["Profile-Id"]);
  if (obj["Profile"]) h.append("Profile", obj["Profile"]);
  if (obj["Authorization"]) h.append("Authorization", obj["Authorization"]);
  if (obj["Cookie"]) h.append("Cookie", obj["Cookie"]);
  // useful defaults
  if (!h.has("Accept")) h.append("Accept", "application/json, text/plain, */*");
  return h;
}

class HTTPError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "HTTPError";
    this.status = status;
  }
}

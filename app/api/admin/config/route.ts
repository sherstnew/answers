import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "uchebnik-headers.json");

async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return { "User-Id": "", "Profile-Id": "", Authorization: "", Profile: "" };
  }
}

async function writeConfig(obj: any) {
  try {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(obj, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("writeConfig error", e);
    return false;
  }
}

function checkPassword(req: Request) {
  const pwd = req.headers.get("x-admin-password") || "";
  const expected = process.env.ADMIN_PASSWORD || "";
  return pwd === expected && expected !== "";
}

export async function GET(req: Request) {
  if (!checkPassword(req)) return new NextResponse("Unauthorized", { status: 401 });
  const cfg = await readConfig();
  return NextResponse.json(cfg);
}

export async function POST(req: Request) {
  if (!checkPassword(req)) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const body = await req.json();
    const ok = await writeConfig(body);
    if (!ok) return new NextResponse("Write error", { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return new NextResponse(String(e?.message || e), { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PATHS = [
  { key: "survival", label: "生存", description: "基本生活保障、住所、日常运转", color: "#34c759", order: 0 },
  { key: "skill", label: "技能", description: "学习、成长、专业能力建设", color: "#0071e3", order: 1 },
  { key: "income", label: "收入", description: "职业收入、副业、财务增长", color: "#ff9500", order: 2 },
  { key: "migration", label: "迁移", description: "城市切换、环境变化、人生转折", color: "#af52de", order: 3 },
  { key: "creation", label: "作品", description: "创作、项目、个人品牌积累", color: "#ff2d55", order: 4 },
  { key: "health", label: "健康", description: "身体、心理、精力管理", color: "#30d158", order: 5 },
];

// GET /api/life-map - Fetch full life map
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    let lifeMap = await prisma.lifeMap.findUnique({
      where: { userId: session.user.id },
      include: {
        paths: {
          include: {
            nodes: {
              include: { branches: true },
              orderBy: { position: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    // Auto-create if not exists
    if (!lifeMap) {
      lifeMap = await prisma.lifeMap.create({
        data: {
          userId: session.user.id,
          paths: {
            create: DEFAULT_PATHS,
          },
        },
        include: {
          paths: {
            include: {
              nodes: {
                include: { branches: true },
                orderBy: { position: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });
    }

    const mapData = {
      id: lifeMap.id,
      currentPosition: lifeMap.currentPosition ? JSON.parse(lifeMap.currentPosition) : null,
      paths: lifeMap.paths.map((p) => ({
        id: p.id,
        key: p.key,
        label: p.label,
        description: p.description,
        color: p.color,
        active: p.active,
        order: p.order,
        nodes: p.nodes.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.description,
          status: n.status,
          abilityTags: n.abilityTags ? JSON.parse(n.abilityTags) : [],
          historyNotes: n.historyNotes ? JSON.parse(n.historyNotes) : [],
          nextSuggestions: n.nextSuggestions ? JSON.parse(n.nextSuggestions) : [],
          position: n.position,
          branches: n.branches.map((b) => ({
            id: b.id,
            title: b.title,
            description: b.description,
            abandonReason: b.abandonReason,
            cost: b.cost,
            consequence: b.consequence,
            active: b.active,
          })),
        })),
      })),
    };

    return NextResponse.json({ map: mapData });
  } catch {
    return NextResponse.json({ error: "获取人生地图失败" }, { status: 500 });
  }
}

// PATCH /api/life-map - Update current position
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { currentPosition } = body;

    const lifeMap = await prisma.lifeMap.findUnique({
      where: { userId: session.user.id },
    });

    if (!lifeMap) {
      return NextResponse.json({ error: "地图不存在" }, { status: 404 });
    }

    await prisma.lifeMap.update({
      where: { id: lifeMap.id },
      data: {
        currentPosition: currentPosition ? JSON.stringify(currentPosition) : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { registerAllTools, getToolDefinitions } from "@/lib/agent/tool-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  registerAllTools(session.user.id);
  const definitions = getToolDefinitions();

  const TOOL_META: Record<string, { category: string; icon: string; color: string }> = {
    create_goal:      { category: "目标管理", icon: "Target",     color: "blue"   },
    update_goal:      { category: "目标管理", icon: "Target",     color: "blue"   },
    list_goals:       { category: "目标管理", icon: "Target",     color: "blue"   },
    add_milestone:    { category: "目标管理", icon: "CheckCircle",color: "blue"   },
    create_memory:    { category: "记忆系统", icon: "Brain",      color: "purple" },
    search_memories:  { category: "记忆系统", icon: "Brain",      color: "purple" },
    get_life_map:     { category: "人生地图", icon: "Map",        color: "green"  },
    create_life_node: { category: "人生地图", icon: "Map",        color: "green"  },
    update_life_node: { category: "人生地图", icon: "Map",        color: "green"  },
    create_checkin:   { category: "打卡签到", icon: "CalendarCheck", color: "orange" },
    get_today_checkin:{ category: "打卡签到", icon: "CalendarCheck", color: "orange" },
    update_profile:   { category: "个人档案", icon: "User",       color: "teal"   },
    get_profile:      { category: "个人档案", icon: "User",       color: "teal"   },
    update_skill:     { category: "技能追踪", icon: "Zap",        color: "yellow" },
    list_skills:      { category: "技能追踪", icon: "Zap",        color: "yellow" },
    read_file:        { category: "文件系统", icon: "File",       color: "gray"   },
    list_directory:   { category: "文件系统", icon: "Folder",     color: "gray"   },
    write_file:       { category: "文件系统", icon: "FilePen",    color: "gray"   },
    get_file_info:    { category: "文件系统", icon: "FileSearch", color: "gray"   },
  };

  const tools = definitions.map((def) => {
    const meta = TOOL_META[def.function.name] ?? { category: "其他", icon: "Tool", color: "gray" };
    return {
      name: def.function.name,
      description: def.function.description,
      parameters: def.function.parameters,
      category: meta.category,
      icon: meta.icon,
      color: meta.color,
    };
  });

  const grouped: Record<string, typeof tools> = {};
  for (const tool of tools) {
    if (!grouped[tool.category]) grouped[tool.category] = [];
    grouped[tool.category].push(tool);
  }

  return NextResponse.json({ tools, grouped, total: tools.length });
}

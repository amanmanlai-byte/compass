import type { ToolDefinition, ToolHandler, RegisteredTool } from "@/lib/types";
import prisma from "@/lib/db/prisma";
import { readFile, readdir, stat, writeFile, mkdir } from "fs/promises";
import { join, resolve, extname } from "path";

// ===== Tool Registry =====

const toolRegistry = new Map<string, RegisteredTool>();

export function registerTool(definition: ToolDefinition, handler: ToolHandler): void {
  toolRegistry.set(definition.function.name, { definition, handler });
}

export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(toolRegistry.values()).map((tool) => tool.definition);
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const tool = toolRegistry.get(name);
  if (!tool) {
    return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
  try {
    const result = await tool.handler(args);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return JSON.stringify({ error: errorMessage });
  }
}

// ===== File System Security =====

// Allowed base directories for file operations
const ALLOWED_BASE_DIRS = [
  process.env.COMPASS_WORKSPACE || "",
  process.env.HOME || "",
  process.env.USERPROFILE || "",
].filter(Boolean);

// Blocked file extensions (sensitive files)
const BLOCKED_EXTENSIONS = [".env", ".env.local", ".env.development", ".env.production"];

// Blocked file patterns
const BLOCKED_PATTERNS = [/node_modules/, /\.git\//, /\.next\//];

function isPathAllowed(filePath: string): boolean {
  const resolved = resolve(filePath);

  // Check blocked extensions
  const ext = extname(resolved).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) return false;

  // Check blocked patterns
  if (BLOCKED_PATTERNS.some((p) => p.test(resolved))) return false;

  // Check if path is under allowed directory
  if (ALLOWED_BASE_DIRS.length > 0) {
    return ALLOWED_BASE_DIRS.some((dir) => resolved.startsWith(resolve(dir)));
  }

  // If no allowed dirs configured, allow all (development mode only)
  return process.env.NODE_ENV !== "production";
}

// ===== Helper: Safe JSON Parse =====

function safeParseJSON(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

// ===== Register All Tools =====

export function registerAllTools(userId: string): void {
  // Clear existing tools
  toolRegistry.clear();

  // ===== Goal Tools =====
  registerTool(
    {
      type: "function",
      function: {
        name: "create_goal",
        description: "Create a new goal for the user. Use this when the user wants to set a new goal or objective.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "The goal title" },
            category: { type: "string", enum: ["career", "skill", "health", "finance", "relationship", "custom"], description: "Goal category" },
            description: { type: "string", description: "Detailed description of the goal" },
            priority: { type: "string", enum: ["low", "medium", "high"], description: "Goal priority" },
          },
          required: ["title", "category"],
        },
      },
    },
    async (args) => {
      const priorityMap: Record<string, number> = { low: 0, medium: 1, high: 2 };
      const goal = await prisma.goal.create({
        data: {
          userId,
          title: args.title as string,
          category: args.category as string,
          description: (args.description as string) || null,
          priority: priorityMap[(args.priority as string) || "medium"] ?? 1,
          status: "active",
        },
      });
      return JSON.stringify({ success: true, goal });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "update_goal",
        description: "Update an existing goal's status, priority, or other properties.",
        parameters: {
          type: "object",
          properties: {
            goal_id: { type: "string", description: "The goal ID" },
            title: { type: "string", description: "Updated title" },
            status: { type: "string", enum: ["active", "completed", "paused", "abandoned"], description: "New status" },
            priority: { type: "string", enum: ["low", "medium", "high"], description: "New priority" },
            description: { type: "string", description: "Updated description" },
          },
          required: ["goal_id"],
        },
      },
    },
    async (args) => {
      const { goal_id, ...rawUpdateData } = args;
      const updateData: Record<string, unknown> = {};
      if (rawUpdateData.title) updateData.title = rawUpdateData.title;
      if (rawUpdateData.status) updateData.status = rawUpdateData.status;
      if (rawUpdateData.description) updateData.description = rawUpdateData.description;
      if (rawUpdateData.priority) {
        const priorityMap: Record<string, number> = { low: 0, medium: 1, high: 2 };
        updateData.priority = priorityMap[rawUpdateData.priority as string] ?? 1;
      }

      const goal = await prisma.goal.update({
        where: { id: goal_id as string },
        data: updateData,
      });
      return JSON.stringify({ success: true, goal });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "list_goals",
        description: "List all goals for the user, optionally filtered by status or category.",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["active", "completed", "paused", "abandoned"], description: "Filter by status" },
            category: { type: "string", enum: ["career", "skill", "health", "finance", "relationship", "custom"], description: "Filter by category" },
          },
        },
      },
    },
    async (args) => {
      const where: Record<string, unknown> = { userId };
      if (args.status) where.status = args.status;
      if (args.category) where.category = args.category;

      const goals = await prisma.goal.findMany({
        where,
        include: { milestones: true },
        orderBy: { createdAt: "desc" },
      });
      return JSON.stringify({ goals });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "add_milestone",
        description: "Add a milestone to an existing goal.",
        parameters: {
          type: "object",
          properties: {
            goal_id: { type: "string", description: "The goal ID" },
            title: { type: "string", description: "Milestone title" },
            description: { type: "string", description: "Milestone description" },
          },
          required: ["goal_id", "title"],
        },
      },
    },
    async (args) => {
      const milestone = await prisma.milestone.create({
        data: {
          goalId: args.goal_id as string,
          title: args.title as string,
          description: (args.description as string) || null,
          status: "pending",
        },
      });
      return JSON.stringify({ success: true, milestone });
    }
  );

  // ===== Memory Tools =====
  registerTool(
    {
      type: "function",
      function: {
        name: "create_memory",
        description: "Store an important memory about the user. Use this to remember facts, preferences, emotions, decisions, or goals.",
        parameters: {
          type: "object",
          properties: {
            content: { type: "string", description: "The memory content" },
            category: { type: "string", enum: ["fact", "preference", "goal", "emotion", "decision", "habit"], description: "Memory category" },
            importance: { type: "number", description: "Importance level 1-10 (default 5)" },
          },
          required: ["content", "category"],
        },
      },
    },
    async (args) => {
      const memory = await prisma.memory.create({
        data: {
          userId,
          content: args.content as string,
          category: args.category as string,
          importance: (args.importance as number) || 5,
        },
      });
      return JSON.stringify({ success: true, memory });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "search_memories",
        description: "Search through stored memories by keyword or category.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search keyword" },
            category: { type: "string", enum: ["fact", "preference", "goal", "emotion", "decision", "habit"], description: "Filter by category" },
            limit: { type: "number", description: "Max results (default 10)" },
          },
        },
      },
    },
    async (args) => {
      const where: Record<string, unknown> = { userId };
      if (args.category) where.category = args.category;
      if (args.query) {
        where.content = { contains: args.query as string };
      }

      const memories = await prisma.memory.findMany({
        where,
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: (args.limit as number) || 10,
      });
      return JSON.stringify({ memories });
    }
  );

  // ===== Life Map Tools =====
  registerTool(
    {
      type: "function",
      function: {
        name: "get_life_map",
        description: "Get the user's complete life map with all paths and nodes.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    async () => {
      const lifeMap = await prisma.lifeMap.findUnique({
        where: { userId },
        include: {
          paths: {
            include: { nodes: true },
            orderBy: { order: "asc" },
          },
        },
      });
      return JSON.stringify({ lifeMap });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "create_life_node",
        description: "Create a new node on the life map. Nodes represent milestones or decision points in the user's life paths.",
        parameters: {
          type: "object",
          properties: {
            path_id: { type: "string", description: "The life path ID to add this node to" },
            title: { type: "string", description: "Node title" },
            description: { type: "string", description: "Node description" },
            ability_tags: { type: "string", description: "Comma-separated ability tags" },
          },
          required: ["path_id", "title"],
        },
      },
    },
    async (args) => {
      // Get max position in path
      const maxPos = await prisma.lifeNode.findFirst({
        where: { lifePathId: args.path_id as string },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      const node = await prisma.lifeNode.create({
        data: {
          lifePathId: args.path_id as string,
          title: args.title as string,
          description: (args.description as string) || null,
          abilityTags: args.ability_tags ? JSON.stringify((args.ability_tags as string).split(",").map((t) => t.trim())) : null,
          position: (maxPos?.position ?? -1) + 1,
        },
      });
      return JSON.stringify({ success: true, node });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "update_life_node",
        description: "Update a life node's status, title, or other properties.",
        parameters: {
          type: "object",
          properties: {
            node_id: { type: "string", description: "The node ID" },
            title: { type: "string", description: "Updated title" },
            status: { type: "string", enum: ["pending", "active", "completed", "skipped"], description: "New status" },
            description: { type: "string", description: "Updated description" },
          },
          required: ["node_id"],
        },
      },
    },
    async (args) => {
      const { node_id, ...updateData } = args;
      const node = await prisma.lifeNode.update({
        where: { id: node_id as string },
        data: updateData,
      });
      return JSON.stringify({ success: true, node });
    }
  );

  // ===== Check-in Tools =====
  registerTool(
    {
      type: "function",
      function: {
        name: "create_checkin",
        description: "Create or update today's check-in with focus, plan, completed items, and blockers.",
        parameters: {
          type: "object",
          properties: {
            current_focus: { type: "string", description: "Current focus area" },
            today_plan: { type: "string", description: "Today's plan" },
            completed_items: { type: "string", description: "Comma-separated completed items" },
            blockers: { type: "string", description: "Comma-separated blockers" },
            destination: { type: "string", description: "Target direction/goal" },
          },
        },
      },
    },
    async (args) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentFocus = args.current_focus as string | undefined;
      const todayPlan = args.today_plan as string | undefined;
      const destination = args.destination as string | undefined;
      const completedItemsStr = args.completed_items as string | undefined;
      const blockersStr = args.blockers as string | undefined;

      const checkin = await prisma.checkIn.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
          currentFocus,
          todayPlan,
          completedItems: completedItemsStr ? JSON.stringify(completedItemsStr.split(",").map((i: string) => ({ text: i.trim() }))) : undefined,
          blockers: blockersStr ? JSON.stringify(blockersStr.split(",").map((b: string) => ({ text: b.trim() }))) : undefined,
          destination,
        },
        create: {
          userId,
          date: today,
          currentFocus,
          todayPlan,
          completedItems: completedItemsStr ? JSON.stringify(completedItemsStr.split(",").map((i: string) => ({ text: i.trim() }))) : undefined,
          blockers: blockersStr ? JSON.stringify(blockersStr.split(",").map((b: string) => ({ text: b.trim() }))) : undefined,
          destination,
        },
      });
      return JSON.stringify({ success: true, checkin });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "get_today_checkin",
        description: "Get today's check-in status and recent patterns.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayCheckIn, recentCheckIns] = await Promise.all([
        prisma.checkIn.findUnique({
          where: { userId_date: { userId, date: today } },
        }),
        prisma.checkIn.findMany({
          where: { userId },
          orderBy: { date: "desc" },
          take: 7,
          select: { blockers: true, completedItems: true, date: true },
        }),
      ]);

      return JSON.stringify({ todayCheckIn, recentCheckIns });
    }
  );

  // ===== Profile Tools =====
  registerTool(
    {
      type: "function",
      function: {
        name: "update_profile",
        description: "Update the user's profile information including bio, life stage, values, strengths, weaknesses, interests, and current focus.",
        parameters: {
          type: "object",
          properties: {
            bio: { type: "string", description: "User bio/introduction" },
            life_stage: { type: "string", description: "Current life stage" },
            core_values: { type: "string", description: "Comma-separated core values" },
            strengths: { type: "string", description: "Comma-separated strengths" },
            weaknesses: { type: "string", description: "Comma-separated weaknesses" },
            interests: { type: "string", description: "Comma-separated interests" },
            current_focus: { type: "string", description: "Current focus area" },
          },
        },
      },
    },
    async (args) => {
      const updateData: Record<string, unknown> = {};
      if (args.bio) updateData.bio = args.bio as string;
      if (args.life_stage) updateData.lifeStage = args.life_stage as string;
      if (args.current_focus) updateData.currentFocus = args.current_focus as string;
      if (args.core_values) updateData.coreValues = JSON.stringify((args.core_values as string).split(",").map((v: string) => v.trim()));
      if (args.strengths) updateData.strengths = JSON.stringify((args.strengths as string).split(",").map((s: string) => s.trim()));
      if (args.weaknesses) updateData.weaknesses = JSON.stringify((args.weaknesses as string).split(",").map((w: string) => w.trim()));
      if (args.interests) updateData.interests = JSON.stringify((args.interests as string).split(",").map((i: string) => i.trim()));

      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          ...updateData,
        },
      });
      return JSON.stringify({ success: true, profile });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "get_profile",
        description: "Get the user's complete profile information.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    async () => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });
      return JSON.stringify({ profile });
    }
  );

  // ===== Skill Tools =====
  registerTool(
    {
      type: "function",
      function: {
        name: "update_skill",
        description: "Update or create a skill tag with level and evidence.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Skill name" },
            level: { type: "number", description: "Skill level 1-10" },
            evidence: { type: "string", description: "Evidence or notes about this skill" },
          },
          required: ["name"],
        },
      },
    },
    async (args) => {
      const skill = await prisma.skillTag.upsert({
        where: { userId_name: { userId, name: args.name as string } },
        update: {
          level: args.level as number | undefined,
          evidence: args.evidence as string | undefined,
        },
        create: {
          userId,
          name: args.name as string,
          level: (args.level as number) || 1,
          evidence: args.evidence as string | undefined,
        },
      });
      return JSON.stringify({ success: true, skill });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "list_skills",
        description: "List all skill tags for the user.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    async () => {
      const skills = await prisma.skillTag.findMany({
        where: { userId },
        orderBy: { level: "desc" },
      });
      return JSON.stringify({ skills });
    }
  );

  // ===== File System Tools =====

  registerTool(
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read the contents of a local file. Use this to read documents, notes, or any text files on the user's computer.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute or relative path to the file" },
            encoding: { type: "string", enum: ["utf-8", "base64"], description: "File encoding (default: utf-8)" },
          },
          required: ["path"],
        },
      },
    },
    async (args) => {
      const filePath = args.path as string;
      const encoding = (args.encoding as string) || "utf-8";

      if (!isPathAllowed(filePath)) {
        return JSON.stringify({ error: "Access denied: file path not allowed" });
      }

      const content = await readFile(filePath, { encoding: encoding as "utf-8" });
      return JSON.stringify({
        success: true,
        path: filePath,
        content: content.slice(0, 10000), // Limit to 10KB
        truncated: content.length > 10000,
      });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "list_directory",
        description: "List files and subdirectories in a directory. Use this to explore the user's file structure.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Directory path" },
            max_depth: { type: "number", description: "Maximum depth to list (default: 1)" },
          },
          required: ["path"],
        },
      },
    },
    async (args) => {
      const dirPath = args.path as string;
      const maxDepth = (args.max_depth as number) || 1;

      if (!isPathAllowed(dirPath)) {
        return JSON.stringify({ error: "Access denied: directory path not allowed" });
      }

      async function listDir(dir: string, depth: number): Promise<Array<{ name: string; type: string; path: string }>> {
        if (depth > maxDepth) return [];

        const entries = await readdir(dir, { withFileTypes: true });
        const results: Array<{ name: string; type: string; path: string }> = [];

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (!isPathAllowed(fullPath)) continue;

          results.push({
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            path: fullPath,
          });

          if (entry.isDirectory() && depth < maxDepth) {
            const subEntries = await listDir(fullPath, depth + 1);
            results.push(...subEntries);
          }
        }

        return results;
      }

      const items = await listDir(dirPath, 1);
      return JSON.stringify({ success: true, path: dirPath, items });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "write_file",
        description: "Write content to a local file. Use this to create or update files on the user's computer.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to write to" },
            content: { type: "string", description: "Content to write" },
            mode: { type: "string", enum: ["overwrite", "append"], description: "Write mode (default: overwrite)" },
          },
          required: ["path", "content"],
        },
      },
    },
    async (args) => {
      const filePath = args.path as string;
      const content = args.content as string;
      const mode = (args.mode as string) || "overwrite";

      if (!isPathAllowed(filePath)) {
        return JSON.stringify({ error: "Access denied: file path not allowed" });
      }

      if (content.length > 100000) {
        return JSON.stringify({ error: "Content too large (max 100KB)" });
      }

      const flag = mode === "append" ? "a" : "w";
      await writeFile(filePath, content, { flag });
      return JSON.stringify({ success: true, path: filePath, bytesWritten: content.length });
    }
  );

  registerTool(
    {
      type: "function",
      function: {
        name: "get_file_info",
        description: "Get information about a file or directory (size, modification time, etc.).",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File or directory path" },
          },
          required: ["path"],
        },
      },
    },
    async (args) => {
      const filePath = args.path as string;

      if (!isPathAllowed(filePath)) {
        return JSON.stringify({ error: "Access denied: file path not allowed" });
      }

      const fileStat = await stat(filePath);
      return JSON.stringify({
        success: true,
        path: filePath,
        type: fileStat.isDirectory() ? "directory" : "file",
        size: fileStat.size,
        created: fileStat.birthtime.toISOString(),
        modified: fileStat.mtime.toISOString(),
        accessed: fileStat.atime.toISOString(),
      });
    }
  );
}

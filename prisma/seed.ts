import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const hashedPassword = await bcrypt.hash("demo123456", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      password: hashedPassword,
    },
  });

  // Create default settings
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      theme: "system",
      fontSize: "md",
      bubbleStyle: "modern",
      fontFamily: "system",
      codeTheme: "github",
      language: "zh",
      systemPrompt: "你是一个有用的 AI 助手。请用中文回答用户的问题。",
      streamingEnabled: true,
      temperature: 0.7,
      maxTokens: 4096,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      contextLength: 20,
    },
  });

  // Create preset prompts
  const presets = [
    {
      name: "💻 程序员助手",
      content:
        "你是一位经验丰富的全栈程序员，精通多种编程语言和技术栈。请提供清晰、高效、有注释的代码示例，并解释关键概念。",
    },
    {
      name: "✍️ 写作助手",
      content:
        "你是一位专业的写作助手，擅长各类文体创作。请帮助优化文章结构、润色语言、提供创意建议。",
    },
    {
      name: "🌐 翻译官",
      content:
        "你是一位专业翻译，精通中英文。请提供准确、自然、符合文化习惯的翻译，必要时添加注释说明翻译选择。",
    },
    {
      name: "🎓 学习伙伴",
      content:
        "你是一位耐心且知识渊博的导师。请用通俗易懂的方式解释复杂概念，善用类比和实例，鼓励批判性思考。",
    },
    {
      name: "📰 内容分析师",
      content:
        "你是一位专业内容分析师，擅长从文本中提取关键信息、识别模式、生成摘要和洞察报告。",
    },
  ];

  for (const preset of presets) {
    await prisma.presetPrompt.create({
      data: {
        userId: user.id,
        name: preset.name,
        content: preset.content,
      },
    });
  }

  // Create a demo conversation
  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: "你好，请介绍一下你自己",
      model: "openai:gpt-4o-mini",
      messages: {
        create: [
          {
            role: "user",
            content: "你好！请介绍一下你自己。",
          },
          {
            role: "assistant",
            content:
              "你好！👋 我是 AI Chat 智能助手，很高兴认识你！\n\n我具备以下能力：\n\n- 💬 **多模型支持**：可接入 OpenAI、Anthropic、Google、DeepSeek 等 15+ 家 AI 提供商\n- 🔄 **流式输出**：实时生成回复，打字机效果\n- 🖼️ **多模态**：支持图像理解和文件分析\n- 🌐 **联网搜索**：获取最新信息\n- 📝 **Markdown 渲染**：代码高亮、数学公式、表格\n- 🎨 **个性化设置**：多种主题、气泡风格、字体选择\n\n有什么我可以帮你的吗？😊",
            tokens: 150,
          },
        ],
      },
    },
  });

  // Create quick commands
  const commands = [
    { command: "/translate", label: "翻译", prompt: "请将以下内容翻译成中文：\n" },
    { command: "/summarize", label: "总结", prompt: "请用简洁的语言总结以下内容：\n" },
    { command: "/optimize", label: "优化", prompt: "请优化以下文字，使其更清晰、简洁：\n" },
    { command: "/explain", label: "解释代码", prompt: "请解释以下代码的功能和原理：\n" },
    { command: "/test", label: "写测试", prompt: "请为以下代码编写单元测试：\n" },
    { command: "/email", label: "改写为邮件", prompt: "请将以下内容改写成一封正式的邮件：\n" },
    { command: "/continue", label: "继续", prompt: "请继续完成上文的内容。" },
  ];

  for (const cmd of commands) {
    await prisma.quickCommand.create({
      data: {
        userId: user.id,
        command: cmd.command,
        label: cmd.label,
        prompt: cmd.prompt,
      },
    });
  }

  console.log("✅ Seed completed!");
  console.log(`📧 Demo login: demo@example.com / (see .env for credentials)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

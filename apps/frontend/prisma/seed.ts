import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      image: "https://via.placeholder.com/150",
      timezone: "UTC",
    },
  });

  console.log("✅ Created user:", user.email);

  // Create a test chat thread
  const thread = await prisma.chatThread.upsert({
    where: { id: "test-thread-1" },
    update: {},
    create: {
      id: "test-thread-1",
      userId: user.id,
      title: "Welcome to AI Calendar Assistant",
      modelProvider: "openai",
      modelName: "gpt-4",
    },
  });

  console.log("✅ Created thread:", thread.title);

  // Create some test messages
  const messages = [
    {
      threadId: thread.id,
      userId: user.id,
      role: "assistant" as const,
      content:
        "Hello! I'm your AI Calendar Assistant. I can help you manage your calendar, schedule events, and answer questions about your schedule. How can I assist you today?",
    },
    {
      threadId: thread.id,
      userId: user.id,
      role: "user" as const,
      content: "Can you help me schedule a meeting for tomorrow at 2 PM?",
    },
    {
      threadId: thread.id,
      userId: user.id,
      role: "assistant" as const,
      content:
        "I'd be happy to help you schedule a meeting! However, I'll need to connect to your calendar first. Please sign in with your Google account to access your calendar and schedule events.",
    },
  ];

  for (const messageData of messages) {
    await prisma.chatMessage.create({
      data: messageData,
    });
  }

  console.log("✅ Created test messages");

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

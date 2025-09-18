// Check if a message is asking for confirmation
export const isConfirmationMessage = (content: string) => {
  const confirmationKeywords = [
    "**Title:**",
    "**Date & Time:**",
    "**Location:**",
    "**Description:**",
  ];
  return confirmationKeywords.some((keyword) => content.includes(keyword));
};

// Render markdown-like text to HTML
export const renderMarkdown = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold'>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")
    .replace(
      /`(.*?)`/g,
      "<code class='bg-gray-100 px-2 py-1 rounded-lg text-sm font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200'>$1</code>",
    )
    .replace(/\n/g, "<br />");
};

// Merge messages by serverId to avoid flicker
export const mergeMessages = (
  serverMessages: any[],
  optimisticMessages: any[],
) => {
  const serverMessageIds = new Set(serverMessages.map((msg) => msg.id));

  // Remove optimistic messages that have been replaced by server messages
  const filteredOptimistic = optimisticMessages.filter(
    (msg) => !msg.isOptimistic || !serverMessageIds.has(msg.id),
  );

  return [...serverMessages, ...filteredOptimistic];
};

// Show toast message and auto-hide after 3 seconds
export const showToast = (
  message: string,
  setToastMessage: (message: string | null) => void,
) => {
  setToastMessage(message);
  setTimeout(() => {
    setToastMessage(null);
  }, 3000);
};

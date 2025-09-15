import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import type { GeminiModel, OptimisticMessage, Event } from "~/types/chat";

export const useChat = () => {
  const { data: session, status } = useSession();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [input, setInput] = useState<string>("");
  const [model, setModel] = useState<GeminiModel>("gemini-2.5-flash");
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [optimisticEvents, setOptimisticEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showConfirmationButtons, setShowConfirmationButtons] = useState<
    Set<string>
  >(new Set());
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasInitialized = useRef<boolean>(false);
  const lastMessageCountRef = useRef<number>(0);
  const isSendingRef = useRef<boolean>(false);

  // tRPC queries and mutations
  const threadsQuery = api.chat.getThreads.useQuery(undefined, {
    enabled: !!session,
  });
  const threads = threadsQuery.data ?? [];
  const refetchThreads = threadsQuery.refetch;

  const messagesQuery = api.chat.getMessages.useQuery(
    { threadId: currentThreadId! },
    { enabled: !!currentThreadId && !!session },
  );
  const messages = messagesQuery.data ?? [];
  const refetchMessages = messagesQuery.refetch;

  const availableProvidersQuery = api.ai.getAvailableProviders.useQuery();
  const availableProviders = availableProvidersQuery.data;

  const createThreadMutation = api.chat.createThread.useMutation({
    onSuccess: (newThread) => {
      setCurrentThreadId(newThread.id);
      void refetchThreads();
    },
  });

  const addMessageMutation = api.chat.addMessage.useMutation({
    onSuccess: () => {
      void refetchMessages();
    },
    onError: () => {
      setOptimisticMessages((prev) =>
        prev.filter((msg) => !msg.isOptimistic || msg.role !== "user"),
      );
      isSendingRef.current = false;
    },
  });

  const updateThreadMutation = api.chat.updateThread.useMutation({
    onSuccess: () => {
      void refetchThreads();
      setEditingThread(null);
      setEditingTitle("");
    },
  });

  const deleteThreadMutation = api.chat.deleteThread.useMutation({
    onSuccess: (_, variables) => {
      void refetchThreads();

      if (currentThreadId === variables.threadId) {
        setCurrentThreadId(null);
        setOptimisticMessages([]);
      }

      if (editingThread === variables.threadId) {
        setEditingThread(null);
      }
    },
  });

  const updateThreadModelMutation = api.chat.updateThreadModel.useMutation({
    onSuccess: () => {
      void refetchThreads();
    },
  });

  return {
    // State
    session,
    status,
    currentThreadId,
    setCurrentThreadId,
    input,
    setInput,
    model,
    setModel,
    editingThread,
    setEditingThread,
    editingTitle,
    setEditingTitle,
    optimisticMessages,
    setOptimisticMessages,
    events,
    setEvents,
    optimisticEvents,
    setOptimisticEvents,
    eventsLoading,
    setEventsLoading,
    eventsError,
    setEventsError,
    toastMessage,
    setToastMessage,
    isExecutingTool,
    setIsExecutingTool,
    streamingText,
    setStreamingText,
    isStreaming,
    setIsStreaming,
    showConfirmationButtons,
    setShowConfirmationButtons,
    isWebSearching,
    setIsWebSearching,
    isOnline,
    setIsOnline,
    networkError,
    setNetworkError,

    // Refs
    listRef,
    inputRef,
    hasInitialized,
    lastMessageCountRef,
    isSendingRef,

    // Data
    threads,
    refetchThreads,
    messages,
    refetchMessages,
    availableProviders,

    // Mutations
    createThreadMutation,
    addMessageMutation,
    updateThreadMutation,
    deleteThreadMutation,
    updateThreadModelMutation,
  };
};

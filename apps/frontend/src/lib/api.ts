/**
 * API utility functions for backend communication
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export interface ChatThread {
  id: number;
  title: string;
  model_provider: string;
  model_name: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

export interface CreateThreadRequest {
  title: string;
  model_provider: "openai" | "anthropic" | "gemini";
  model_name: string;
}

export interface PostMessageRequest {
  content: string;
}

export interface UpdateThreadRequest {
  title: string;
}

// Chat API functions
export const chatApi = {
  // Create a new chat thread
  async createThread(
    data: CreateThreadRequest,
  ): Promise<{ thread_id: number }> {
    const response = await fetch(`${BACKEND_URL}/api/v1/chat/thread`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create thread: ${response.statusText}`);
    }

    return response.json() as Promise<{ thread_id: number }>;
  },

  // Get all threads for the current user
  async getThreads(): Promise<{ threads: ChatThread[] }> {
    const response = await fetch(`${BACKEND_URL}/api/v1/chat/threads`);

    if (!response.ok) {
      throw new Error(`Failed to get threads: ${response.statusText}`);
    }

    return response.json() as Promise<{ threads: ChatThread[] }>;
  },

  // Get messages for a specific thread
  async getMessages(threadId: number): Promise<{ messages: ChatMessage[] }> {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/chat/${threadId}/messages`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.statusText}`);
    }

    return response.json() as Promise<{ messages: ChatMessage[] }>;
  },

  // Post a message to a thread
  async postMessage(
    threadId: number,
    data: PostMessageRequest,
  ): Promise<ChatMessage> {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/chat/${threadId}/message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to post message: ${response.statusText}`);
    }

    return response.json() as Promise<ChatMessage>;
  },

  // Update a thread's title
  async updateThread(
    threadId: number,
    data: UpdateThreadRequest,
  ): Promise<ChatThread> {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/chat/thread/${threadId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update thread: ${response.statusText}`);
    }

    return response.json() as Promise<ChatThread>;
  },

  // Delete a thread
  async deleteThread(
    threadId: number,
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/chat/thread/${threadId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete thread: ${response.statusText}`);
    }

    return response.json() as Promise<{ success: boolean; message: string }>;
  },
};

// Health check
export const healthApi = {
  async check(): Promise<{ status: string }> {
    const response = await fetch(`${BACKEND_URL}/api/v1/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json() as Promise<{ status: string }>;
  },
};

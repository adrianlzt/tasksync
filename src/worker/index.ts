import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import { sign, verify } from 'hono/jwt';
import { DatabaseService } from "./database";
import { ChatService } from "./chatService";
import { OAuthService } from "./oauthService";
import { fetchGoogleTaskListsWithOAuth, fetchGoogleTasksWithOAuth } from "./googleApi";
import { SearchRequestSchema, ChatRequestSchema, TaskSchema } from "../shared/types";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

const SESSION_COOKIE_NAME = 'session_token';

const authMiddleware = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    if (!payload || !payload.user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', payload.user);
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

// Initialize services
const getDbService = (env: Env) => new DatabaseService(env.DB);
const getChatService = (env: Env) => new ChatService(getDbService(env));
const getOAuthService = (env: Env) => new OAuthService(getDbService(env));

// OAuth endpoints
app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: body.code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'postmessage',
        grant_type: "authorization_code",
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.json();
      console.error('Google token exchange failed:', errorBody);
      return c.json({ error: "Failed to exchange code for token" }, 400);
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!userInfoResponse.ok) {
        return c.json({ error: "Failed to fetch user info" }, 400);
    }
    const userInfo = await userInfoResponse.json();
    
    const user = {
        id: userInfo.id,
        email: userInfo.email,
    };
    
    const token = await sign({ user }, c.env.JWT_SECRET);
    
    setCookie(c, SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return c.json({ success: true }, 200);

  } catch (error) {
    console.error('Session creation failed:', error);
    return c.json({ error: "Internal server error during session creation" }, 500);
  }
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  setCookie(c, SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Request Google OAuth permissions
app.post('/api/oauth/google/request', authMiddleware, async (c) => {
  const user = c.get("user");
  const oauthService = getOAuthService(c.env);
  
  const authUrl = await oauthService.getGoogleAuthUrl(user!.id);
  return c.json({ authUrl });
});

// Handle Google OAuth callback
app.post('/api/oauth/google/callback', authMiddleware, async (c) => {
  const user = c.get("user");
  const { code } = await c.req.json();
  
  if (!code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }
  
  const oauthService = getOAuthService(c.env);
  await oauthService.exchangeGoogleCode(user!.id, code);
  
  return c.json({ success: true });
});

// Sync Google Tasks (now requires auth)
app.post("/api/sync/tasks", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const db = getDbService(c.env);
    const oauthService = getOAuthService(c.env);
    
    // Get user's OAuth token
    const token = await oauthService.getGoogleToken(user!.id);
    if (!token) {
      return c.json({ error: "Google OAuth not configured. Please authorize access first." }, 400);
    }

    // Fetch and save task lists
    const taskLists = await fetchGoogleTaskListsWithOAuth(token.access_token);
    for (const list of taskLists) {
      await db.saveTaskList({
        google_list_id: list.id,
        title: list.title,
        updated_at: list.updated,
        user_id: user!.id,
      });
    }

    // Fetch and save tasks for each list
    let totalTasks = 0;
    for (const list of taskLists) {
      const tasks = await fetchGoogleTasksWithOAuth(token.access_token, list.id);
      for (const task of tasks) {
        await db.saveTask({
          google_task_id: task.id,
          title: task.title,
          notes: task.notes || null,
          status: task.status,
          due_date: task.due || null,
          completed_date: task.completed || null,
          parent_task_id: task.parent || null,
          position: task.position,
          task_list_id: list.id,
          updated_at: task.updated,
          user_id: user!.id,
        });
        totalTasks++;
      }
    }

    await db.updateSyncStatus('google_tasks', user!.id);

    return c.json({ 
      success: true, 
      synced: { 
        task_lists: taskLists.length, 
        tasks: totalTasks 
      } 
    });
  } catch (error) {
    console.error('Sync error:', error);
    return c.json({ error: "Failed to sync tasks" }, 500);
  }
});

// Get all tasks (protected by auth)
app.get("/api/tasks", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const db = getDbService(c.env);
    const taskListId = c.req.query("list_id");
    const tasks = await db.getTasks(user!.id, taskListId || undefined);
    return c.json(tasks);
  } catch (error) {
    return c.json({ error: "Failed to fetch tasks" }, 500);
  }
});

// Get all task lists (protected by auth)
app.get("/api/task-lists", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const db = getDbService(c.env);
    const taskLists = await db.getTaskLists(user!.id);
    return c.json(taskLists);
  } catch (error) {
    return c.json({ error: "Failed to fetch task lists" }, 500);
  }
});

// Get keep notes (protected by auth)
app.get("/api/notes", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const db = getDbService(c.env);
    const notes = await db.getKeepNotes(user!.id);
    return c.json(notes);
  } catch (error) {
    return c.json({ error: "Failed to fetch notes" }, 500);
  }
});

// Search endpoint (protected by auth)
app.post("/api/search", authMiddleware, zValidator("json", SearchRequestSchema), async (c) => {
  try {
    const user = c.get("user");
    const { query, type } = c.req.valid("json");
    const db = getDbService(c.env);
    
    let results: any = {};
    
    if (type === 'all' || type === 'tasks') {
      results.tasks = await db.searchTasks(query, user!.id);
    }
    
    if (type === 'all' || type === 'notes') {
      results.notes = await db.searchKeepNotes(query, user!.id);
    }
    
    return c.json(results);
  } catch (error) {
    return c.json({ error: "Search failed" }, 500);
  }
});

// Chat endpoint (protected by auth)
app.post("/api/chat", authMiddleware, zValidator("json", ChatRequestSchema), async (c) => {
  try {
    const user = c.get("user");
    const { message } = c.req.valid("json");
    const chatService = getChatService(c.env);
    
    const result = await chatService.processMessage(message, user!.id);
    
    return c.json({
      response: result.response,
      tool_calls: result.toolCalls,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: "Chat request failed" }, 500);
  }
});

// Execute tool call (protected by auth)
app.post("/api/chat/execute-tool", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const toolCall = await c.req.json();
    const chatService = getChatService(c.env);
    
    const result = await chatService.executeToolCall(toolCall, user!.id);
    
    return c.json({
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Tool execution error:', error);
    return c.json({ error: "Tool execution failed" }, 500);
  }
});

// Manual task operations (protected by auth)
app.post("/api/tasks", authMiddleware, zValidator("json", TaskSchema.omit({ id: true, created_at: true, synced_at: true, user_id: true })), async (c) => {
  try {
    const user = c.get("user");
    const taskData = c.req.valid("json");
    const db = getDbService(c.env);
    
    await db.saveTask({
      ...taskData,
      user_id: user!.id,
      updated_at: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to create task" }, 500);
  }
});

app.delete("/api/tasks/:id", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const taskId = c.req.param("id");
    const db = getDbService(c.env);
    
    await db.deleteTask(taskId, user!.id);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete task" }, 500);
  }
});

// Check Google OAuth status
app.get("/api/oauth/google/status", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const oauthService = getOAuthService(c.env);
    
    const token = await oauthService.getGoogleToken(user!.id);
    
    return c.json({ 
      connected: !!token,
      scopes: token?.scope?.split(' ') || []
    });
  } catch (error) {
    return c.json({ error: "Failed to check OAuth status" }, 500);
  }
});

// User settings endpoints
app.get("/api/user/settings", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const db = getDbService(c.env);
    
    const settings = await db.getUserSettings(user!.id);
    
    return c.json({ 
      openai_api_key_configured: !!settings?.openai_api_key 
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

app.post("/api/user/settings", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const { openai_api_key } = await c.req.json();
    const db = getDbService(c.env);
    
    await db.updateUserSettings(user!.id, { openai_api_key });
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

export default app;

import type { Env } from './types';
import { handleAdminLogin, handleAdminUpdateTicket } from './routes/admin';
import {
  handleGetTickets,
  handleCreateTicket,
  handleGetTicket,
  handleReopenTicket,
} from './routes/tickets';
import { handleGetMessages, handleSendMessage } from './routes/messages';
import { handleNotionWebhook } from './routes/webhooks';

export type { Env };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // ----------------------------------------------------
    // ADMIN AUTH: POST /api/admin/login
    // ----------------------------------------------------
    if (method === 'POST' && pathname === '/api/admin/login') {
      return handleAdminLogin(request, env);
    }

    // ----------------------------------------------------
    // WEBHOOKS: POST /api/webhooks/notion (Notion -> App)
    // ----------------------------------------------------
    if (method === 'POST' && pathname === '/api/webhooks/notion') {
      return handleNotionWebhook(request, env, ctx);
    }

    // ----------------------------------------------------
    // TICKETS: GET /api/tickets & POST /api/tickets
    // ----------------------------------------------------
    if (pathname === '/api/tickets') {
      if (method === 'GET') {
        return handleGetTickets(env);
      }
      if (method === 'POST') {
        return handleCreateTicket(request, env);
      }
    }

    // ----------------------------------------------------
    // REOPEN: POST /api/tickets/:ticketRef/reopen
    // ----------------------------------------------------
    const reopenMatch = pathname.match(/^\/api\/tickets\/([^/]+)\/reopen$/);
    if (method === 'POST' && reopenMatch) {
      return handleReopenTicket(reopenMatch[1], env);
    }

    // ----------------------------------------------------
    // MESSAGES: GET & POST /api/tickets/:ticketRef/messages
    // ----------------------------------------------------
    const messagesMatch = pathname.match(/^\/api\/tickets\/([^/]+)\/messages$/);
    if (messagesMatch) {
      const ticketRef = messagesMatch[1];
      if (method === 'GET') {
        return handleGetMessages(ticketRef, env);
      }
      if (method === 'POST') {
        return handleSendMessage(ticketRef, request, env);
      }
    }

    // ----------------------------------------------------
    // SINGLE TICKET: GET & PATCH /api/tickets/:ticketRef
    // ----------------------------------------------------
    const singleTicketMatch = pathname.match(/^\/api\/tickets\/([^/]+)$/);
    if (singleTicketMatch && !pathname.endsWith('/messages')) {
      const ticketRef = singleTicketMatch[1];
      if (method === 'GET') {
        return handleGetTicket(ticketRef, env);
      }
      if (method === 'PATCH') {
        return handleAdminUpdateTicket(ticketRef, request, env);
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

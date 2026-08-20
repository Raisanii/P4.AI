// P4.AI — Task intent orchestration (§7.11, §7.12, NFR-12).
//
// Single entry point for the inbound handler: detect a task intent, validate
// it, execute it through the backend state machine, and return a user-facing
// reply. If the message has no task intent, returns `{ handled: false }` so
// the caller falls through to the general chatbot responder.
//
// AI proposes, backend decides (§10): the AI only detects intent; the state
// machine enforces all transitions + activity logging.

import { detectIntent } from "@/services/task-agent/intent";
import { validateIntent } from "@/services/task-agent/validate";
import { executeIntent } from "@/services/task-agent/execute";
import type { Role } from "@/lib/roles";

export interface TaskAgentInput {
  userId: string;
  role: Role;
  text: string;
}

export interface TaskAgentOutput {
  handled: boolean;
  reply?: string;
}

/**
 * Try to handle an inbound message as a task intent.
 * Returns `{ handled: true, reply }` on success or rejection,
 * or `{ handled: false }` when the message has no task intent (caller
 * falls through to the general chatbot).
 */
export async function tryHandleTaskIntent(
  input: TaskAgentInput,
): Promise<TaskAgentOutput> {
  // Layer 1+2: detect intent (deterministic command → AI → keyword fallback).
  const intent = await detectIntent(input.text);
  if (!intent) return { handled: false };

  // Layer 3: validate (task exists, permission, state transition legal).
  const validation = await validateIntent(intent, {
    userId: input.userId,
    role: input.role,
  });

  if (!validation.ok) {
    return { handled: true, reply: validation.reply };
  }

  // Layer 4: execute through the state machine (the only mutation path).
  const result = await executeIntent({
    intent,
    validation,
    userId: input.userId,
  });

  return { handled: true, reply: result.reply };
}

import { Injectable, Logger } from '@nestjs/common';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { ToolGateway } from '@personal-os/tools';
import { OrchestrationStepTrace } from '@personal-os/shared';
import { createChatModel } from './model-factory';
import { createLangGraphTools } from './langgraph-tools';
import { fileLogger } from '../../common/file-logger.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * State schema for the Chief LangGraph coordinator
 */
const ChiefGraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  userId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  taskId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  traces: Annotation<OrchestrationStepTrace[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
});

type ChiefGraphState = typeof ChiefGraphAnnotation.State;

@Injectable()
export class ChiefGraphService {
  private readonly logger = new Logger(ChiefGraphService.name);

  /**
   * Executes the multi-turn agentic graph.
   * Runs tool calls in parallel, self-corrects based on findings, and returns synthesized answers.
   */
  async execute(params: {
    prompt: string;
    userId: string;
    taskId?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    gateway: ToolGateway;
  }): Promise<{
    summary: string;
    traces: OrchestrationStepTrace[];
    toolOutputs: Record<string, unknown>;
  }> {
    const taskId = params.taskId || uuidv4();
    const userId = params.userId;
    const tools = createLangGraphTools(params.gateway, userId, taskId);
    const toolsMap = new Map<string, any>(tools.map((t) => [t.name, t]));

    let stepCounter = 1;
    const initialTraces: OrchestrationStepTrace[] = [];

    // 1. Initialize Multi-Provider LLM with tools bound
    const baseModel = createChatModel();
    const modelWithTools = (baseModel as any).bindTools
      ? (baseModel as any).bindTools(tools)
      : baseModel;

    // 2. Define the Agent Node
    const agentNode = async (state: ChiefGraphState) => {
      const startTime = Date.now();
      const response = await modelWithTools.invoke(state.messages);

      const aiMsg = response as AIMessage;
      const toolCalls = aiMsg.tool_calls || [];
      const hasTools = toolCalls.length > 0;

      const trace: OrchestrationStepTrace = {
        id: uuidv4(),
        stepNumber: stepCounter++,
        phase: hasTools ? 'specialist_processing' : 'synthesis',
        agent: 'Chief Agent (LangGraph)',
        name: hasTools
          ? `Parallel Plan: [${toolCalls.map((tc) => tc.name).join(', ')}]`
          : 'Synthesize Cross-Agent Verdict',
        description: hasTools
          ? `Identified ${toolCalls.length} tool(s) to execute in parallel.`
          : 'Finalized response grounded in verified findings.',
        status: 'completed',
        durationMs: Date.now() - startTime,
        timestamp: new Date().toLocaleTimeString(),
        details: hasTools
          ? { plannedTools: toolCalls.map((tc) => ({ tool: tc.name, args: tc.args })) }
          : {},
      };

      return {
        messages: [aiMsg],
        traces: [trace],
      };
    };

    // 3. Define the Parallel Tool Execution Node
    const toolNode = async (state: ChiefGraphState) => {
      const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
      const toolCalls = lastMsg.tool_calls || [];
      const newTraces: OrchestrationStepTrace[] = [];

      fileLogger.log(
        `LangGraph executing ${toolCalls.length} tools in parallel: [${toolCalls.map((t) => t.name).join(', ')}]`,
        'ChiefGraphService',
        { toolCalls },
      );

      // Execute all tool calls concurrently via Promise.all
      const toolMessages = await Promise.all(
        toolCalls.map(async (tc) => {
          const tStartTime = Date.now();
          const tool = toolsMap.get(tc.name);

          let outputText = '';
          let isSuccess = true;

          if (!tool) {
            outputText = `Error: Tool '${tc.name}' is not registered.`;
            isSuccess = false;
          } else {
            try {
              const res = await tool.invoke(tc.args as any);
              outputText = typeof res === 'string' ? res : JSON.stringify(res);
            } catch (err: any) {
              outputText = `Error executing '${tc.name}': ${err.message}`;
              isSuccess = false;
            }
          }

          const trace: OrchestrationStepTrace = {
            id: uuidv4(),
            stepNumber: stepCounter++,
            phase: 'connector_fetch',
            agent: tc.name.replace(/_/g, ' ').toUpperCase(),
            name: `Execute ${tc.name}`,
            description: `Arguments: ${JSON.stringify(tc.args)}`,
            status: isSuccess ? 'completed' : 'failed',
            durationMs: Date.now() - tStartTime,
            timestamp: new Date().toLocaleTimeString(),
            details: { tool: tc.name, args: tc.args },
          };
          newTraces.push(trace);

          return new ToolMessage({
            tool_call_id: tc.id || uuidv4(),
            content: outputText,
            name: tc.name,
          });
        }),
      );

      return {
        messages: toolMessages,
        traces: newTraces,
      };
    };

    // 4. Conditional Edge: check if LLM requested tools or has finished
    const shouldContinue = (state: ChiefGraphState) => {
      const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
      if (lastMsg?.tool_calls && lastMsg.tool_calls.length > 0) {
        return 'tools';
      }
      return END;
    };

    // 5. Construct StateGraph
    const workflow = new StateGraph(ChiefGraphAnnotation)
      .addNode('agent', agentNode)
      .addNode('tools', toolNode)
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', shouldContinue, ['tools', END])
      .addEdge('tools', 'agent');

    const app = workflow.compile();

    // 6. Build Initial Message Chain (Chronological history + Current Prompt)
    const initialMessages: BaseMessage[] = [
      new SystemMessage(
        `You are Chief Ghost, the personal AI OS coordinator.
You help the operator search Google Drive, inspect emails via Gmail, discover matching engineering jobs, compare shopping items, and evaluate discretionary budgets.

RULES:
1. When asked to look for files, folders, or documents, call "search_drive".
2. When asked about emails, messages, or recruiter notes, call "search_gmail".
3. When asked about jobs or career openings, call "search_jobs".
4. If a task requires multiple tools (e.g. check emails and find a file in drive), call both tools together. They will execute in parallel.
5. If Google Drive or Gmail returns that the service is disconnected, politely advise the user to authorize under the Connectors tab.
6. Present final results cleanly in Markdown with bold headers and clickable links when URLs are available.`,
      ),
    ];

    if (params.conversationHistory && params.conversationHistory.length > 0) {
      for (const turn of params.conversationHistory) {
        if (turn.role === 'user') {
          initialMessages.push(new HumanMessage(turn.content));
        } else if (turn.role === 'assistant') {
          initialMessages.push(new AIMessage(turn.content));
        }
      }
    }

    initialMessages.push(new HumanMessage(params.prompt));

    // Initial Trace: LangGraph Graph Assembly
    initialTraces.push({
      id: uuidv4(),
      stepNumber: stepCounter++,
      phase: 'intent_parsing',
      agent: 'Chief Agent (LangGraph)',
      name: 'Assemble Stateful Agent Graph',
      description: `Initialized LangGraph state machine with ${tools.length} parallel-capable tools.`,
      status: 'completed',
      durationMs: 4,
      timestamp: new Date().toLocaleTimeString(),
      details: {
        registeredTools: tools.map((t) => t.name),
        conversationTurns: (params.conversationHistory || []).length,
      },
    });

    try {
      const finalState = await app.invoke(
        {
          messages: initialMessages,
          userId,
          taskId,
          traces: initialTraces,
        },
        { recursionLimit: 8 },
      );

      const lastAiMessage = [...finalState.messages]
        .reverse()
        .find((m) => m instanceof AIMessage && (!m.tool_calls || m.tool_calls.length === 0)) as AIMessage;

      const summary =
        lastAiMessage?.content && typeof lastAiMessage.content === 'string'
          ? lastAiMessage.content
          : 'Chief Agent completed orchestration via LangGraph.';

      return {
        summary,
        traces: finalState.traces || [],
        toolOutputs: {},
      };
    } catch (err: any) {
      fileLogger.error(`LangGraph execution failed: ${err.message}`, err.stack, 'ChiefGraphService');
      throw err;
    }
  }
}

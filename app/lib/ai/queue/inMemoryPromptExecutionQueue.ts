import { randomUUID } from "node:crypto";

import {
  type PromptExecutionHandler,
  type PromptExecutionJob,
  type PromptExecutionJobResult,
  type PromptExecutionQueue,
} from "@/lib/ai/queue/types";

interface InternalQueuedJob {
  job: PromptExecutionJob;
  resolve: (value: PromptExecutionJobResult) => void;
  reject: (reason?: unknown) => void;
}

export class InMemoryPromptExecutionQueue implements PromptExecutionQueue {
  private readonly executionHandler: PromptExecutionHandler;
  private readonly queue: InternalQueuedJob[] = [];
  private isProcessing = false;

  public constructor(executionHandler: PromptExecutionHandler) {
    this.executionHandler = executionHandler;
  }

  public enqueue(prompt: string): Promise<PromptExecutionJobResult> {
    const normalizedPrompt = prompt.trim();

    if (!normalizedPrompt) {
      return Promise.reject(new Error("Prompt is required and cannot be empty."));
    }

    const job: PromptExecutionJob = {
      id: randomUUID(),
      prompt: normalizedPrompt,
      createdAt: new Date().toISOString(),
    };

    return new Promise<PromptExecutionJobResult>((resolve, reject) => {
      this.queue.push({ job, resolve, reject });
      void this.processQueue();
    });
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const queuedJob = this.queue.shift();

        if (!queuedJob) {
          break;
        }

        try {
          const responses = await this.executionHandler.execute(queuedJob.job.prompt);
          queuedJob.resolve({
            job: queuedJob.job,
            responses,
          });
        } catch (error) {
          queuedJob.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

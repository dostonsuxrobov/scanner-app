// Runs image jobs in a Web Worker, one promise per job. If the worker dies
// (out of memory on a huge image, a script error), every waiting job fails
// with a message and a fresh worker is started for the next one.
import WorkerScript from '../workers/image-processor.js?worker';

class WorkerManager {
  constructor() {
    this.pending = new Map();
    this.jobId = 0;
    this.start();
  }

  start() {
    this.worker = new WorkerScript();
    this.worker.onmessage = (e) => {
      const { id, success, result, error, width, height, info, progress } = e.data;
      const job = this.pending.get(id);
      if (!job) return;
      if (progress) return job.onProgress?.(progress);
      this.pending.delete(id);
      success ? job.resolve({ data: result, width, height, info }) : job.reject(new Error(error));
    };
    this.worker.onerror = (e) => {
      e.preventDefault?.();
      this.worker.terminate();
      const jobs = [...this.pending.values()];
      this.pending.clear();
      this.start();
      for (const job of jobs) job.reject(new Error('the image processor stopped (the image may be too large for this device)'));
    };
  }

  process(type, data, onProgress) {
    return new Promise((resolve, reject) => {
      const id = ++this.jobId;
      this.pending.set(id, { resolve, reject, onProgress });
      this.worker.postMessage({ type, id, data });
    });
  }

  terminate() {
    this.worker.terminate();
  }
}

// Singleton
let instance = null;

export function getWorker() {
  if (!instance) instance = new WorkerManager();
  return instance;
}

export function terminateWorker() {
  if (instance) {
    instance.terminate();
    instance = null;
  }
}

import WorkerScript from '../workers/image-processor.js?worker';

class WorkerManager {
  constructor() {
    this.worker = new WorkerScript();
    this.pending = new Map();
    this.jobId = 0;

    this.worker.onmessage = (e) => {
      const { id, success, result, error, width, height, info, progress } = e.data;
      const job = this.pending.get(id);
      if (!job) return;
      if (progress) return job.onProgress?.(progress);
      this.pending.delete(id);
      success ? job.resolve({ data: result, width, height, info }) : job.reject(new Error(error));
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
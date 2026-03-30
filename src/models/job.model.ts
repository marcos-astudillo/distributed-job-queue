export interface CreateJobRequest {
  type: string;
  payload: Record<string, any>;
  run_at?: string;
  max_attempts?: number;
}

export interface Job {
  job_id: string;
  type: string;
  payload: Record<string, any>;
  run_at: string;
}

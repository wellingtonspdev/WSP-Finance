declare namespace Express {
  export interface Request {
    user: {
      id: number;
    };
    workspaceId?: number; // MUDANÇA: string -> number
  }
}